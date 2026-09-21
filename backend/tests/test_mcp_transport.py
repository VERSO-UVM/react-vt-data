"""Protocol, authentication, request bounds and application lifecycle contracts.

These tests use the official SDK against the real ASGI transport, with a tiny
service fake so CI needs neither network sockets nor the production warehouse.
"""

import asyncio
import json
import os
import sys
from dataclasses import replace
from pathlib import Path

import duckdb
import httpx2
import pytest
from fastapi import FastAPI
from mcp import Client
from mcp.client.stdio import StdioServerParameters
from mcp.client.streamable_http import streamable_http_client
from starlette.responses import JSONResponse
from starlette.testclient import TestClient

from data_tools.models import TOOL_MODELS
from mcp_server.config import DEVELOPMENT_TOKEN, MCPSettings
from mcp_server.security import SecurityMiddleware
from mcp_server.server import attach_mcp, create_app, create_server

TOKEN_A = "test-only-a-" + "a" * 40
TOKEN_B = "test-only-b-" + "b" * 40


class FakeService:
    def __init__(self):
        self.calls = []
        self.failure = None
        self.ready = True

    def call(self, name, arguments):
        self.calls.append((name, arguments))
        if self.failure:
            raise self.failure
        return {
            "rows": [{"value": 643077}],
            "tool": name,
            "arguments": arguments,
            "warehouse_version": "fixture",
            "warehouse_modified_at": "2026-01-01T00:00:00Z",
            "dataset_id": "example",
            "columns": ["value"],
            "row_count": 1,
            "has_more": False,
            "next_cursor": None,
            "provenance": {},
            "datasets": [],
        }

    def health(self):
        return {"status": "ready" if self.ready else "unavailable"}


def local_client(app, **kwargs):
    return TestClient(
        app, base_url="http://localhost", client=("127.0.0.1", 1234), **kwargs
    )


def rpc(client, method="tools/list", params=None, **kwargs):
    return client.post(
        "/api/mcp",
        json={"jsonrpc": "2.0", "id": 1, "method": method, "params": params or {}},
        headers={
            "Accept": "application/json, text/event-stream",
            **kwargs.pop("headers", {}),
        },
        **kwargs,
    )


@pytest.mark.parametrize("mode", ["auto", "legacy"])
def test_sdk_client_discovers_shared_schemas_and_calls_structured_tools(mode):
    service = FakeService()
    app = create_app(MCPSettings(), service)

    async def run():
        async with (
            app.router.lifespan_context(app),
            httpx2.AsyncClient(
                transport=httpx2.ASGITransport(app=app), base_url="http://localhost"
            ) as http,
            Client(
                streamable_http_client("http://localhost/api/mcp", http_client=http),
                mode=mode,
            ) as client,
        ):
            listing = await client.list_tools()
            assert {tool.name for tool in listing.tools} == set(TOOL_MODELS)
            for tool in listing.tools:
                assert tool.input_schema == TOOL_MODELS[tool.name].model_json_schema()
                assert tool.annotations.read_only_hint
                assert tool.output_schema["type"] == "object"
            result = await client.call_tool("query_data", {"dataset_id": "example"})
            assert not result.is_error
            assert result.structured_content["rows"] == [{"value": 643077}]
            assert json.loads(result.content[0].text) == result.structured_content

    asyncio.run(run())
    assert service.calls[0][0] == "query_data"


def test_native_sdk_and_http_share_validation_without_exposing_inputs():
    service = FakeService()

    async def run():
        async with Client(create_server(service)) as client:
            bad = await client.call_tool(
                "query_data", {"dataset_id": "demo", "limit": 1001}
            )
            assert bad.is_error
            assert "limit" in bad.content[0].text
            unknown = await client.call_tool(
                "query_data", {"dataset_id": "demo", "sql": "SELECT secret"}
            )
            assert unknown.is_error
            assert "SELECT secret" not in unknown.content[0].text
            missing = await client.call_tool("not_a_tool", {})
            assert missing.is_error

    asyncio.run(run())
    assert service.calls == []


@pytest.mark.parametrize(
    "failure,expected",
    [
        (ValueError("Unknown filter; consult describe_dataset"), "Unknown filter"),
        (
            RuntimeError("/private/database.duckdb SELECT supersecret"),
            "temporarily unavailable",
        ),
        (TimeoutError("secret SQL"), "timed out"),
    ],
)
def test_tool_errors_are_actionable_and_internal_errors_are_sanitized(
    failure, expected
):
    service = FakeService()
    service.failure = failure

    async def run():
        async with Client(create_server(service)) as client:
            result = await client.call_tool("list_datasets", {})
            assert result.is_error
            assert expected in result.content[0].text
            assert "secret" not in result.content[0].text
            assert "/private" not in result.content[0].text

    asyncio.run(run())


@pytest.mark.parametrize(
    "mode,tokens,accepted",
    [
        ("none", (), None),
        ("development", (), DEVELOPMENT_TOKEN),
        ("bearer", (TOKEN_A, TOKEN_B), TOKEN_A),
        ("bearer", (TOKEN_A, TOKEN_B), TOKEN_B),
    ],
)
def test_http_authentication_for_protocol_and_health(mode, tokens, accepted):
    service = FakeService()
    settings = MCPSettings(auth_mode=mode, bearer_tokens=tokens)
    with local_client(create_app(settings, service)) as client:
        headers = {"Authorization": f"Bearer {accepted}"} if accepted else {}
        assert rpc(client, headers=headers).status_code == 200
        assert client.get("/api/mcp/health", headers=headers).status_code == 200
        if mode != "none":
            for invalid in (
                {},
                {"Authorization": "Bearer wrong"},
                {"Authorization": f"Basic {accepted}"},
            ):
                response = rpc(client, headers=invalid)
                assert response.status_code == 401
                assert response.headers["www-authenticate"].startswith("Bearer")
                assert client.get("/api/mcp/health", headers=invalid).status_code == 401
                assert accepted not in response.text


def test_rotated_token_is_revoked_after_restart_and_repr_does_not_leak():
    settings = MCPSettings(auth_mode="bearer", bearer_tokens=(TOKEN_B,))
    assert TOKEN_B not in repr(settings)
    with local_client(create_app(settings, FakeService())) as client:
        assert (
            rpc(client, headers={"Authorization": f"Bearer {TOKEN_A}"}).status_code
            == 401
        )
        assert (
            rpc(client, headers={"Authorization": f"Bearer {TOKEN_B}"}).status_code
            == 200
        )


@pytest.mark.parametrize(
    "headers,status",
    [
        ({"Host": "attacker.example"}, 421),
        ({"Origin": "https://attacker.example"}, 403),
        ({"Origin": "null"}, 403),
        ({"Origin": "http://localhost:6768"}, 200),
    ],
)
def test_host_origin_guards_cover_tools_and_health(headers, status):
    with local_client(create_app(MCPSettings(), FakeService())) as client:
        assert rpc(client, headers=headers).status_code == status
        assert client.get("/api/mcp/health", headers=headers).status_code == status


def test_allowed_production_host_origin_and_remote_token():
    settings = MCPSettings(
        auth_mode="bearer",
        bearer_tokens=(TOKEN_A,),
        allowed_hosts=("data.example.org",),
        allowed_origins=("https://report.example.org",),
    )
    with TestClient(
        create_app(settings, FakeService()),
        base_url="https://data.example.org",
        client=("203.0.113.1", 5555),
    ) as client:
        assert (
            rpc(
                client,
                headers={
                    "Authorization": f"Bearer {TOKEN_A}",
                    "Origin": "https://report.example.org",
                },
            ).status_code
            == 200
        )


def test_local_modes_reject_remote_peers_even_with_spoofed_forwarded_headers():
    with TestClient(
        create_app(MCPSettings(), FakeService()),
        base_url="http://localhost",
        client=("203.0.113.1", 5555),
    ) as client:
        assert rpc(client, headers={"X-Forwarded-For": "127.0.0.1"}).status_code == 403


def test_rate_limit_uses_token_identity_not_forwarded_ip():
    settings = MCPSettings(
        auth_mode="bearer", bearer_tokens=(TOKEN_A, TOKEN_B), rate_limit=2
    )
    with local_client(create_app(settings, FakeService())) as client:
        for i in range(2):
            assert (
                rpc(
                    client,
                    headers={
                        "Authorization": f"Bearer {TOKEN_A}",
                        "X-Forwarded-For": f"203.0.113.{i}",
                    },
                ).status_code
                == 200
            )
        blocked = rpc(client, headers={"Authorization": f"Bearer {TOKEN_A}"})
        assert blocked.status_code == 429
        assert blocked.headers["retry-after"] == "60"
        assert (
            rpc(client, headers={"Authorization": f"Bearer {TOKEN_B}"}).status_code
            == 200
        )


def test_request_size_limit_checks_declared_and_actual_body():
    with local_client(
        create_app(MCPSettings(max_request_bytes=1024), FakeService())
    ) as client:
        assert client.post("/api/mcp", content="x" * 1025).status_code == 413
        response = client.post(
            "/api/mcp", content="x" * 1025, headers={"Content-Length": "1"}
        )
        assert response.status_code == 413


def test_concurrency_limit_returns_retry_and_recovers_after_request():
    async def run():
        entered, release = asyncio.Event(), asyncio.Event()

        async def slow_app(scope, receive, send):
            entered.set()
            await release.wait()
            await JSONResponse({"ok": True})(scope, receive, send)

        middleware = SecurityMiddleware(slow_app, MCPSettings(max_concurrency=1))
        async with httpx2.AsyncClient(
            transport=httpx2.ASGITransport(app=middleware), base_url="http://localhost"
        ) as client:
            first = asyncio.create_task(client.post("/api/mcp"))
            await entered.wait()
            try:
                # Unsupported event streams do not compete for the occupied slot.
                assert (await client.get("/api/mcp")).status_code == 405
                second = await client.post("/api/mcp")
                assert second.status_code == 503
                assert second.headers["retry-after"] == "1"
            finally:
                release.set()
            assert (await first).status_code == 200
            assert (await client.post("/api/mcp")).status_code == 200

    asyncio.run(run())


def test_mount_preserves_api_routes_and_owns_mcp_lifespan():
    api = FastAPI()

    @api.get("/api/example")
    def example():
        return {"existing": True}

    settings = MCPSettings(auth_mode="bearer", bearer_tokens=(TOKEN_A,))
    attach_mcp(api, settings, FakeService())
    with local_client(api) as client:
        assert client.get("/api/example").json() == {"existing": True}
        assert client.get("/api/missing").status_code == 404
        assert (
            rpc(client, headers={"Authorization": f"Bearer {TOKEN_A}"}).status_code
            == 200
        )
        assert (
            client.get(
                "/api/mcp/health", headers={"Authorization": f"Bearer {TOKEN_A}"}
            ).status_code
            == 200
        )


def test_unavailable_warehouse_health_is_503():
    service = FakeService()
    service.ready = False
    with local_client(create_app(MCPSettings(), service)) as client:
        assert client.get("/api/mcp/health").status_code == 503


@pytest.mark.parametrize(
    "env",
    [
        {"MCP_AUTH_MODE": "typo"},
        {"MCP_AUTH_MODE": "bearer"},
        {"MCP_AUTH_MODE": "bearer", "MCP_BEARER_TOKENS": "short"},
        {"MCP_AUTH_MODE": "bearer", "MCP_BEARER_TOKENS": DEVELOPMENT_TOKEN},
        {"MCP_AUTH_MODE": "bearer", "MCP_BEARER_TOKENS": f"{TOKEN_A},{TOKEN_A}"},
        {"MCP_MAX_ROWS": "0"},
        {"MCP_QUERY_TIMEOUT": "nan"},
        {"MCP_MAX_BYTES": "2000000"},
        {"MCP_ALLOWED_HOSTS": "*"},
        {"MCP_ALLOWED_ORIGINS": "*"},
    ],
)
def test_configuration_fails_closed(env):
    with pytest.raises(ValueError):
        MCPSettings.from_env(env)


def test_environment_parser_trims_tokens_and_validates_deployment_mode():
    settings = MCPSettings.from_env(
        {
            "MCP_AUTH_MODE": "bearer",
            "MCP_BEARER_TOKENS": f" {TOKEN_A}, {TOKEN_B} ",
            "DATA_DIR": "/data",
            "MCP_ALLOWED_HOSTS": "data.example.org,data.example.org:*",
        }
    )
    assert settings.tokens == (TOKEN_A, TOKEN_B)
    assert str(settings.warehouse_path) == "/data/warehouse.duckdb"
    settings.validate_network("0.0.0.0", mounted=True)
    for mode in ("none", "development"):
        local = replace(settings, auth_mode=mode)
        local.validate_network("127.0.0.1")
        with pytest.raises(ValueError, match="loopback"):
            local.validate_network("0.0.0.0")
        with pytest.raises(ValueError, match="requires"):
            local.validate_network(mounted=True)


def test_real_stdio_subprocess_runs_every_tool_without_network_or_production_data(
    tmp_path,
):
    # A real child process verifies the CLI, stdio framing, SDK lifecycle, shared
    # schemas, SQL service and structured results together, including CSV export.
    path = tmp_path / "warehouse.duckdb"
    with duckdb.connect(str(path)) as conn:
        conn.execute("CREATE TABLE vt_county_geoids(NAME VARCHAR, GEOID VARCHAR)")
        conn.execute(
            "INSERT INTO vt_county_geoids VALUES ('Addison County, Vermont', '50001'), ('Chittenden County, Vermont', '50007')"
        )
        conn.execute(
            "CREATE TABLE acs5Economics_medianHouseholdIncome_timeseries(year VARCHAR, NAME VARCHAR, Median_Household_Income DOUBLE, geo_type VARCHAR)"
        )
        conn.execute(
            "INSERT INTO acs5Economics_medianHouseholdIncome_timeseries VALUES ('2022', 'Addison County, Vermont', 64000, 'county'), ('2022', 'Chittenden County, Vermont', 75000, 'county')"
        )
        conn.execute(
            "CREATE TABLE VersoZoning_info(OBJECT_ID INTEGER, County VARCHAR, Municipal_Name VARCHAR, GEO_ID VARCHAR, District_Name VARCHAR, District_Type VARCHAR, Overlay_District VARCHAR, Acres DOUBLE)"
        )
        conn.execute(
            "INSERT INTO VersoZoning_info VALUES (1, 'Addison', 'Addison', '5000100325', 'R1', 'Residential', 'No', 100)"
        )

    async def run():
        transport = StdioServerParameters(
            command=sys.executable,
            args=["-m", "mcp_server", "--transport", "stdio"],
            cwd=Path(__file__).resolve().parents[1],
            env={**os.environ, "DATA_DIR": str(tmp_path), "MCP_AUTH_MODE": "none"},
        )
        async with Client(transport, read_timeout_seconds=10) as client:
            dataset_id = "acs5_ts_household_income"
            variables = await client.call_tool(
                "search_variables", {"dataset_id": dataset_id}
            )
            assert not variables.is_error, variables
            variable_id = variables.structured_content["variables"][0]["variable_id"]
            requests = {
                "list_datasets": {},
                "describe_dataset": {"dataset_id": dataset_id},
                "search_locations": {"query": "Addison", "geo_type": "county"},
                "query_data": {
                    "dataset_id": dataset_id,
                    "location_ids": ["50001"],
                    "years": [2022],
                },
                "get_timeseries": {"dataset_id": dataset_id, "location_ids": ["50001"]},
                "compare_places": {
                    "dataset_id": dataset_id,
                    "location_ids": ["50001", "50007"],
                    "variable_ids": [variable_id],
                },
                "get_zoning_summary": {"municipality": "Addison"},
                "export_data": {"dataset_id": dataset_id},
            }
            for name, arguments in requests.items():
                result = await client.call_tool(name, arguments)
                assert not result.is_error, (name, result)
                assert result.structured_content["warehouse_version"]
                if name == "query_data":
                    assert (
                        result.structured_content["rows"][0]["Median_Household_Income"]
                        == 64000
                    )
                if name == "compare_places":
                    assert result.structured_content["comparison_year"] == 2022
                if name == "export_data":
                    assert "64000" in result.structured_content["csv"]

    asyncio.run(run())
