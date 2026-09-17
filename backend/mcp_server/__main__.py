"""Run a local HTTP or stdio MCP server without importing the legacy API."""

from __future__ import annotations

import argparse
import asyncio

from mcp_server.config import MCPSettings
from mcp_server.server import _service, create_app, create_server


def main() -> None:
    parser = argparse.ArgumentParser(description="Vermont data MCP server")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=6768)
    parser.add_argument("--transport", choices=("http", "stdio"), default="http")
    args = parser.parse_args()
    try:
        settings = MCPSettings.from_env()
        if args.transport == "stdio":
            if settings.auth_mode != "none":
                parser.error(
                    "stdio uses local process permissions; set MCP_AUTH_MODE=none"
                )
            from mcp.server.stdio import stdio_server

            server = create_server(_service(settings))

            async def run_stdio():
                async with stdio_server() as (read, write):
                    await server.run(
                        read, write, server.create_initialization_options()
                    )

            asyncio.run(run_stdio())
            return
        settings.validate_network(args.host)
    except ValueError as exc:
        parser.error(str(exc))
    import uvicorn

    uvicorn.run(
        create_app(settings),
        host=args.host,
        port=args.port,
        proxy_headers=False,
        access_log=False,
    )


if __name__ == "__main__":
    main()
