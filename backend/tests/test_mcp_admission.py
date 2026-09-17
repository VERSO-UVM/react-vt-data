"""Optional event-stream probes must not consume tool request capacity."""

import asyncio

import httpx2
import pytest
from fastapi import FastAPI
from mcp_types import (
    CLIENT_CAPABILITIES_META_KEY,
    CLIENT_INFO_META_KEY,
    PROTOCOL_VERSION_META_KEY,
)

from mcp_server.config import MCPSettings
from mcp_server.server import attach_mcp, create_app
from tests.test_mcp_transport import TOKEN_A, FakeService, local_client


@pytest.mark.parametrize("mounted", [False, True])
@pytest.mark.parametrize("root_path", ["", "/reporting"])
def test_event_stream_probes_finish_and_leave_tools_available(mounted, root_path):
    service = FakeService()
    settings = MCPSettings(
        auth_mode="bearer", bearer_tokens=(TOKEN_A,), max_concurrency=1
    )
    if mounted:
        app = FastAPI()
        attach_mcp(app, settings, service)
    else:
        app = create_app(settings, service)

    async def run():
        headers = {"Authorization": f"Bearer {TOKEN_A}"}
        async with (
            app.router.lifespan_context(app),
            httpx2.AsyncClient(
                transport=httpx2.ASGITransport(app=app, root_path=root_path),
                base_url=f"http://localhost{root_path}/",
                headers=headers,
            ) as client,
        ):
            # More probes than available slots; before the fix the first GET
            # streams indefinitely and the others return 503. Cancellation on
            # timeout makes that regression fail instead of hanging the suite.
            probes = await asyncio.wait_for(
                asyncio.gather(
                    *[
                        client.get("api/mcp", headers={"Accept": "text/event-stream"})
                        for _ in range(5)
                    ]
                ),
                timeout=2,
            )
            assert all(response.status_code == 405 for response in probes)
            assert all(response.headers["allow"] == "POST" for response in probes)
            assert all(
                response.headers["cache-control"] == "no-store" for response in probes
            )
            assert (await client.get("api/mcp/health")).status_code == 200
            for method, params in (
                ("tools/list", {}),
                (
                    "tools/call",
                    {"name": "query_data", "arguments": {"dataset_id": "example"}},
                ),
            ):
                response = await client.post(
                    "api/mcp",
                    json={
                        "jsonrpc": "2.0",
                        "id": 1,
                        "method": method,
                        "params": params,
                    },
                    headers={"Accept": "application/json, text/event-stream"},
                )
                assert response.status_code == 200
                assert "result" in response.json()
                assert not response.json()["result"].get("isError", False)
            assert service.calls[0][0] == "query_data"

    asyncio.run(run())


@pytest.mark.parametrize(
    "headers,expected",
    [
        ({}, 401),
        ({"Authorization": "Bearer invalid"}, 401),
        ({"Authorization": f"Bearer {TOKEN_A}", "Host": "evil.example"}, 421),
        ({"Authorization": f"Bearer {TOKEN_A}", "Origin": "https://evil.example"}, 403),
    ],
)
def test_stream_probe_still_requires_authentication_and_allowed_origin(
    headers, expected
):
    settings = MCPSettings(auth_mode="bearer", bearer_tokens=(TOKEN_A,))
    with local_client(create_app(settings, FakeService())) as client:
        response = client.get("/api/mcp", headers=headers)
        assert response.status_code == expected


@pytest.mark.parametrize("method", ["GET", "HEAD"])
@pytest.mark.parametrize(
    "path,root_path",
    [
        ("/api/mcp", ""),
        ("/reporting/api/mcp", "/reporting"),
        ("/api/mcp", "/reporting"),
    ],
)
def test_event_stream_probe_does_not_wait_for_a_request_body(method, path, root_path):
    app = create_app(MCPSettings(max_concurrency=1), FakeService())

    async def run():
        messages = []

        async def receive():
            pytest.fail("Rejected probe must not wait for a body or client disconnect")

        async def send(message):
            messages.append(message)

        scope = {
            "type": "http",
            "http_version": "1.1",
            "method": method,
            "scheme": "http",
            "path": path,
            "root_path": root_path,
            "query_string": b"",
            "client": ("127.0.0.1", 1234),
            "server": ("localhost", 80),
            "headers": [(b"host", b"localhost"), (b"accept", b"text/event-stream")],
        }
        async with app.router.lifespan_context(app):
            await app(scope, receive, send)
        assert messages[0]["status"] == 405
        assert messages[-1]["type"] == "http.response.body"
        assert not messages[-1].get("more_body", False)

    asyncio.run(run())


def test_modern_subscription_requests_do_not_open_an_event_stream():
    app = create_app(MCPSettings(max_concurrency=1), FakeService())

    async def run():
        async with (
            app.router.lifespan_context(app),
            httpx2.AsyncClient(
                transport=httpx2.ASGITransport(app=app), base_url="http://localhost"
            ) as client,
        ):
            # This server advertises a fixed tool list and has no subscription
            # handler. Enabling notifications later requires separate capacity
            # for their long-lived streams, including those opened through POST.
            response = await asyncio.wait_for(
                client.post(
                    "/api/mcp",
                    headers={
                        "Accept": "application/json, text/event-stream",
                        "MCP-Protocol-Version": "2026-07-28",
                        "MCP-Method": "subscriptions/listen",
                    },
                    json={
                        "jsonrpc": "2.0",
                        "id": 1,
                        "method": "subscriptions/listen",
                        "params": {
                            "notifications": {"toolsListChanged": True},
                            "_meta": {
                                PROTOCOL_VERSION_META_KEY: "2026-07-28",
                                CLIENT_INFO_META_KEY: {
                                    "name": "regression",
                                    "version": "1",
                                },
                                CLIENT_CAPABILITIES_META_KEY: {},
                            },
                        },
                    },
                ),
                timeout=2,
            )
            assert response.status_code == 404
            assert response.headers["content-type"].startswith("application/json")
            assert response.json()["error"]["code"] == -32601
            assert (await client.get("/api/mcp/health")).status_code == 200

    asyncio.run(run())
