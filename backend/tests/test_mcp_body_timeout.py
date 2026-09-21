"""Incomplete HTTP uploads have a total deadline and release MCP capacity."""

import asyncio
import json
import time
from contextlib import suppress

import httpx2
import pytest
from fastapi import FastAPI

from mcp_server.config import MCPSettings
from mcp_server.server import attach_mcp, create_app
from tests.test_mcp_transport import TOKEN_A, FakeService

TOOL_REQUEST = {
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {"name": "query_data", "arguments": {"dataset_id": "example"}},
}
HEADERS = {
    "Authorization": f"Bearer {TOKEN_A}",
    "Accept": "application/json, text/event-stream",
}


def settings(**overrides):
    return MCPSettings(
        auth_mode="bearer",
        bearer_tokens=(TOKEN_A,),
        max_concurrency=1,
        request_body_timeout=0.1,
        **overrides,
    )


def scope(http_version="1.1"):
    return {
        "type": "http",
        "http_version": http_version,
        "method": "POST",
        "scheme": "http",
        "path": "/api/mcp",
        "root_path": "",
        "query_string": b"",
        "client": ("127.0.0.1", 1234),
        "server": ("localhost", 80),
        "headers": [
            (b"host", b"localhost"),
            (b"authorization", f"Bearer {TOKEN_A}".encode()),
            (b"accept", b"application/json, text/event-stream"),
            (b"content-type", b"application/json"),
        ],
    }


async def raw_request(app, receive, request_scope=None):
    messages = []

    async def send(message):
        messages.append(message)

    await app(request_scope or scope(), receive, send)
    return messages


def client(app):
    return httpx2.AsyncClient(
        transport=httpx2.ASGITransport(app=app),
        base_url="http://localhost",
        headers=HEADERS,
    )


async def assert_recovered(http):
    assert (await http.get("/api/mcp/health")).status_code == 200
    response = await http.post("/api/mcp", json=TOOL_REQUEST)
    assert response.status_code == 200
    assert not response.json()["result"].get("isError", False)
    assert response.json()["result"]["structuredContent"]["rows"] == [{"value": 643077}]


@pytest.mark.parametrize(
    "mounted,partial,http_version",
    [
        (False, False, "1.1"),
        (False, True, "2"),
        (True, False, "2"),
        (True, True, "1.0"),
    ],
)
def test_stalled_upload_times_out_and_releases_capacity(mounted, partial, http_version):
    service = FakeService()
    if mounted:
        app = FastAPI()
        attach_mcp(app, settings(), service)
    else:
        app = create_app(settings(), service)

    async def run():
        entered, never = asyncio.Event(), asyncio.Event()
        sent_partial = False

        async def receive():
            nonlocal sent_partial
            if partial and not sent_partial:
                sent_partial = True
                return {"type": "http.request", "body": b"{", "more_body": True}
            entered.set()
            await never.wait()

        async with app.router.lifespan_context(app), client(app) as http:
            pending = asyncio.create_task(
                raw_request(app, receive, scope(http_version))
            )
            try:
                await asyncio.wait_for(entered.wait(), timeout=1)
                busy = await http.get("/api/mcp/health")
                assert busy.status_code == 503
                assert busy.headers["retry-after"] == "1"
                messages = await asyncio.wait_for(pending, timeout=1)
                assert messages[0]["status"] == 408
                headers = dict(messages[0]["headers"])
                assert headers[b"cache-control"] == b"no-store"
                assert headers[b"content-type"].startswith(b"application/json")
                if http_version.startswith("1."):
                    assert headers[b"connection"] == b"close"
                else:
                    assert b"connection" not in headers
                body = b"".join(m.get("body", b"") for m in messages[1:])
                assert json.loads(body)["error"]
                assert not messages[-1].get("more_body", False)
                assert service.calls == []
                await assert_recovered(http)
            finally:
                pending.cancel()
                with suppress(asyncio.CancelledError):
                    await pending

    asyncio.run(run())


def test_dribbling_body_chunks_do_not_reset_total_deadline():
    app = create_app(settings(), FakeService())

    async def run():
        chunks_received = 0

        async def receive():
            nonlocal chunks_received
            await asyncio.sleep(0.03)
            chunks_received += 1
            return {"type": "http.request", "body": b" ", "more_body": True}

        async with app.router.lifespan_context(app), client(app) as http:
            # An idle timeout restarted per chunk would never expire here.
            messages = await asyncio.wait_for(raw_request(app, receive), timeout=0.6)
            assert messages[0]["status"] == 408
            assert chunks_received > 0
            await assert_recovered(http)

    asyncio.run(run())


def test_complete_chunked_body_reaches_the_tool():
    service = FakeService()
    app = create_app(settings(), service)

    async def run():
        body = json.dumps(TOOL_REQUEST).encode()

        async def chunks():
            yield body[:17]
            await asyncio.sleep(0.01)
            yield body[17:]

        async with app.router.lifespan_context(app), client(app) as http:
            response = await http.post(
                "/api/mcp",
                content=chunks(),
                headers={"Content-Type": "application/json"},
            )
            assert response.status_code == 200
            assert not response.json()["result"].get("isError", False)
            assert service.calls[0][0] == "query_data"
            assert "connection" not in response.headers

    asyncio.run(run())


def test_body_deadline_does_not_limit_downstream_tool_execution():
    class SlowService(FakeService):
        def call(self, name, arguments):
            time.sleep(0.2)
            return super().call(name, arguments)

    app = create_app(settings(), SlowService())

    async def run():
        async with app.router.lifespan_context(app), client(app) as http:
            await assert_recovered(http)

    asyncio.run(run())


@pytest.mark.parametrize("termination", ["disconnect", "cancel"])
def test_interrupted_upload_releases_capacity_without_sending_timeout(termination):
    app = create_app(settings(), FakeService())

    async def run():
        entered, release = asyncio.Event(), asyncio.Event()
        messages = []
        first = True

        async def receive():
            nonlocal first
            if first:
                first = False
                return {"type": "http.request", "body": b"{", "more_body": True}
            entered.set()
            await release.wait()
            return {"type": "http.disconnect"}

        async def send(message):
            messages.append(message)

        async with app.router.lifespan_context(app), client(app) as http:
            pending = asyncio.create_task(app(scope(), receive, send))
            try:
                await asyncio.wait_for(entered.wait(), timeout=1)
                if termination == "cancel":
                    pending.cancel()
                    with pytest.raises(asyncio.CancelledError):
                        await pending
                else:
                    release.set()
                    await asyncio.wait_for(pending, timeout=1)
                assert messages == []
                await assert_recovered(http)
            finally:
                pending.cancel()
                with suppress(asyncio.CancelledError):
                    await pending

    asyncio.run(run())


@pytest.mark.parametrize("rejection", ["auth", "size"])
def test_authentication_and_declared_size_reject_before_reading_body(rejection):
    app = create_app(settings(max_request_bytes=1024), FakeService())

    async def run():
        request_scope = scope()
        if rejection == "auth":
            request_scope["headers"] = [
                item for item in request_scope["headers"] if item[0] != b"authorization"
            ]
        else:
            request_scope["headers"].append((b"content-length", b"1025"))

        async def receive():
            pytest.fail(
                "Authentication and declared size rejection must not read a body"
            )

        async with app.router.lifespan_context(app), client(app) as http:
            messages = await raw_request(app, receive, request_scope)
            assert messages[0]["status"] == (401 if rejection == "auth" else 413)
            await assert_recovered(http)

    asyncio.run(run())


def test_request_body_timeout_defaults_and_environment():
    assert MCPSettings().request_body_timeout == 10.0
    for value in ("0.1", "3.5", "120"):
        actual = MCPSettings.from_env({"MCP_REQUEST_BODY_TIMEOUT": value})
        assert actual.request_body_timeout == float(value)


@pytest.mark.parametrize(
    "value", ["0", "0.09", "120.1", "nan", "inf", "-inf", "invalid"]
)
def test_request_body_timeout_rejects_invalid_environment_values(value):
    with pytest.raises(ValueError):
        MCPSettings.from_env({"MCP_REQUEST_BODY_TIMEOUT": value})
