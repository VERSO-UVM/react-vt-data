"""Official MCP protocol adapter over the transport-independent data service."""

from __future__ import annotations

import json
import logging
from contextlib import asynccontextmanager
from functools import partial
from typing import Any, Protocol

import anyio
from mcp.server import Server
from mcp.server.transport_security import TransportSecuritySettings
from mcp.types import (
    CallToolRequestParams,
    CallToolResult,
    ListToolsResult,
    TextContent,
    Tool,
    ToolAnnotations,
)
from pydantic import ValidationError
from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.routing import Route

from mcp_server.config import MCPSettings
from mcp_server.schemas import output_schema
from mcp_server.security import SecurityMiddleware

logger = logging.getLogger(__name__)

INSTRUCTIONS = (
    "Read-only Vermont public data tools. Start with list_datasets, then "
    "describe_dataset and search_variables/search_locations before querying. "
    "Use returned identifiers exactly. Keep geography, year, measure, and units "
    "consistent when comparing places. Follow next_cursor until exhausted when "
    "a complete result is needed. Cite provenance and disclose source caveats, "
    "missing values, and truncation in reports. No arbitrary SQL is accepted."
)


class DataService(Protocol):
    def call(self, tool_name: str, arguments: dict[str, Any]) -> dict[str, Any]: ...
    def health(self) -> dict[str, Any]: ...


def _service(settings: MCPSettings) -> DataService:
    from data_tools.service import DataToolService

    return DataToolService(
        warehouse_path=settings.warehouse_path,
        max_rows=settings.max_rows,
        max_bytes=settings.max_bytes,
        query_timeout=settings.query_timeout,
        max_concurrency=settings.max_concurrency,
    )


def _error(message: str, code: str = "invalid_request") -> CallToolResult:
    return CallToolResult(
        content=[
            TextContent(
                type="text",
                text=json.dumps({"error": {"code": code, "message": message}}),
            )
        ],
        is_error=True,
    )


def create_server(service: DataService) -> Server:
    """Create an SDK server using the same Pydantic definitions as native tools."""
    from data_tools.models import TOOL_DESCRIPTIONS, TOOL_MODELS

    tools = [
        Tool(
            name=name,
            description=TOOL_DESCRIPTIONS[name],
            input_schema=model.model_json_schema(),
            output_schema=output_schema(name),
            annotations=ToolAnnotations(
                readOnlyHint=True,
                destructiveHint=False,
                idempotentHint=True,
                openWorldHint=False,
            ),
        )
        for name, model in TOOL_MODELS.items()
    ]

    async def list_tools(_context, params) -> ListToolsResult:
        if params and params.cursor:
            raise ValueError("The tool registry has no further pages")
        return ListToolsResult(tools=tools)

    async def call_tool(_context, params: CallToolRequestParams) -> CallToolResult:
        model = TOOL_MODELS.get(params.name)
        if model is None:
            return _error("Unknown tool; use tools/list to discover available tools")
        try:
            # The SDK low-level API does not validate tool arguments itself.
            arguments = model.model_validate(params.arguments or {}).model_dump(
                mode="json"
            )
            result = await anyio.to_thread.run_sync(
                partial(service.call, params.name, arguments)
            )
            text = json.dumps(
                result, ensure_ascii=False, allow_nan=False, separators=(",", ":")
            )
            return CallToolResult(
                content=[TextContent(type="text", text=text)],
                structured_content=result,
            )
        except ValidationError as exc:
            messages = [
                f"{'.'.join(map(str, item['loc'])) or 'arguments'}: {item['msg']}"
                for item in exc.errors(include_input=False, include_url=False)
            ]
            return _error("; ".join(messages))
        except ValueError as exc:
            return _error(str(exc), getattr(exc, "code", "invalid_request"))
        except TimeoutError:
            return _error(
                "The query timed out; narrow your filters and retry", "query_timeout"
            )
        except Exception as exc:  # noqa: BLE001 -- remote error boundary must hide internals
            # Do not put SQL, filesystem paths, data, or authorization into logs/results.
            logger.error("MCP tool %s failed (%s)", params.name, type(exc).__name__)
            return _error(
                "Data is temporarily unavailable; retry or contact the server operator",
                "unavailable",
            )

    return Server(
        "vermont-data",
        version="1.0.0",
        description="Read-only tools for Vermont community data and report generation",
        instructions=INSTRUCTIONS,
        on_list_tools=list_tools,
        on_call_tool=call_tool,
    )


def create_app(settings: MCPSettings | None = None, service: DataService | None = None):
    """Standalone ASGI app. The CLI additionally validates the listener address."""
    settings = settings or MCPSettings.from_env()
    service = service or _service(settings)
    server = create_server(service)

    async def health(_request: Request):
        try:
            status = await anyio.to_thread.run_sync(service.health)
            ready = (
                status.get("status") in {"ok", "ready"} or status.get("ready") is True
            )
            return JSONResponse(status, status_code=200 if ready else 503)
        except Exception:  # noqa: BLE001 -- readiness deliberately reports no internals
            return JSONResponse({"status": "unavailable"}, status_code=503)

    app = server.streamable_http_app(
        streamable_http_path="/api/mcp",
        json_response=True,
        stateless_http=True,
        max_request_body_size=settings.max_request_bytes,
        transport_security=TransportSecuritySettings(
            enable_dns_rebinding_protection=True,
            allowed_hosts=list(settings.allowed_hosts),
            allowed_origins=list(settings.allowed_origins),
        ),
        custom_starlette_routes=[Route("/api/mcp/health", health, methods=["GET"])],
    )
    app.add_middleware(SecurityMiddleware, settings=settings)
    app.state.mcp_server = server
    app.state.data_service = service
    app.state.mcp_settings = settings
    return app


def attach_mcp(
    api_app, settings: MCPSettings | None = None, service: DataService | None = None
):
    """Attach exact routes and lifespan without intercepting other API endpoints."""
    settings = settings or MCPSettings.from_env()
    settings.validate_network(mounted=True)
    mcp_app = create_app(settings, service)
    previous_lifespan = api_app.router.lifespan_context

    @asynccontextmanager
    async def lifespan(app):
        async with (
            previous_lifespan(app) as state,
            mcp_app.router.lifespan_context(mcp_app),
        ):
            yield state

    api_app.router.lifespan_context = lifespan
    api_app.router.routes.extend(
        [
            Route("/api/mcp", mcp_app, methods=["GET", "POST", "DELETE"]),
            Route("/api/mcp/health", mcp_app, methods=["GET"]),
        ]
    )
    api_app.state.mcp_app = mcp_app
    return mcp_app
