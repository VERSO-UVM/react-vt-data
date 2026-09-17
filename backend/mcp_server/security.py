"""Bearer authentication and bounded HTTP admission before MCP parsing."""

from __future__ import annotations

import hashlib
import hmac
import time
from collections import OrderedDict

from starlette._utils import get_route_path
from starlette.datastructures import Headers
from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Receive, Scope, Send

from mcp_server.config import MCP_PATH, MCPSettings, is_loopback


def _matches(value: str, allowed: tuple[str, ...]) -> bool:
    if value in allowed:
        return True
    # The only accepted pattern is an exact host/origin plus any numeric port.
    for pattern in allowed:
        if pattern.endswith(":*"):
            prefix = pattern[:-1]
            if value.startswith(prefix) and value[len(prefix) :].isdigit():
                return True
    return False


class SecurityMiddleware:
    def __init__(self, app: ASGIApp, settings: MCPSettings) -> None:
        self.app = app
        self.settings = settings
        self._active = 0
        self._rates: OrderedDict[str, tuple[float, int]] = OrderedDict()
        self._token_hashes = tuple(
            hashlib.sha256(token.encode("ascii")).digest() for token in settings.tokens
        )

    def _identity(self, scope: Scope, headers: Headers) -> str | None:
        if self.settings.auth_mode == "none":
            return f"local:{(scope.get('client') or ('unknown',))[0]}"
        authorization = headers.get("authorization", "")
        kind, _, token = authorization.partition(" ")
        if kind.lower() != "bearer" or not token or len(token) > 512:
            return None
        supplied = hashlib.sha256(token.encode("utf-8")).digest()
        matched = False
        for expected in self._token_hashes:
            matched |= hmac.compare_digest(supplied, expected)
        return f"token:{supplied.hex()}" if matched else None

    def _allow_rate(self, identity: str) -> bool:
        now = time.monotonic()
        # Expire oldest keys and cap memory, including anonymous local addresses.
        while self._rates:
            key, (started, _) = next(iter(self._rates.items()))
            if now - started < 60 and len(self._rates) < 1024:
                break
            self._rates.pop(key)
        started, count = self._rates.get(identity, (now, 0))
        if now - started >= 60:
            started, count = now, 0
        self._rates[identity] = (started, count + 1)
        return count < self.settings.rate_limit

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        headers = Headers(scope=scope)

        async def reject(status: int, message: str, extra: dict | None = None) -> None:
            await JSONResponse(
                {"error": message},
                status_code=status,
                headers={"Cache-Control": "no-store", **(extra or {})},
            )(scope, receive, send)

        if not _matches(headers.get("host", "").lower(), self.settings.allowed_hosts):
            await reject(421, "Host is not allowed")
            return
        origin = headers.get("origin")
        if origin is not None and not _matches(origin, self.settings.allowed_origins):
            await reject(403, "Origin is not allowed")
            return
        peer = (scope.get("client") or ("",))[0]
        if self.settings.auth_mode != "bearer" and not is_loopback(peer):
            await reject(403, "Local MCP mode accepts loopback clients only")
            return
        # Reject duplicate authentication headers instead of choosing ambiguously.
        if len(headers.getlist("authorization")) > 1:
            await reject(
                401,
                "Invalid bearer token",
                {"WWW-Authenticate": 'Bearer realm="vt-data"'},
            )
            return
        identity = self._identity(scope, headers)
        if identity is None:
            await reject(
                401,
                "A valid bearer token is required",
                {"WWW-Authenticate": 'Bearer realm="vt-data"'},
            )
            return
        if not self._allow_rate(identity):
            await reject(429, "MCP request rate exceeded", {"Retry-After": "60"})
            return
        if scope["method"] in {"GET", "HEAD"} and get_route_path(scope) == MCP_PATH:
            # This stateless, JSON-response server has no unsolicited messages.
            # Reject optional SSE probes before reading a body or taking a slot;
            # an idle GET stream would otherwise hold capacity until disconnect.
            await reject(
                405,
                "Standalone event streams are not supported; use POST for MCP requests",
                {"Allow": "POST"},
            )
            return
        if self._active >= self.settings.max_concurrency:
            await reject(503, "MCP is busy; retry shortly", {"Retry-After": "1"})
            return
        self._active += 1
        try:
            content_length = headers.get("content-length")
            if content_length:
                try:
                    length = int(content_length)
                except ValueError:
                    await reject(400, "Invalid Content-Length")
                    return
                if length < 0 or length > self.settings.max_request_bytes:
                    await reject(413, "MCP request is too large")
                    return
            # Bound actual bytes as well as declared length, including chunked bodies.
            body = bytearray()
            while True:
                message = await receive()
                if message["type"] == "http.disconnect":
                    return
                body.extend(message.get("body", b""))
                if len(body) > self.settings.max_request_bytes:
                    await reject(413, "MCP request is too large")
                    return
                if not message.get("more_body", False):
                    break
            delivered = False

            async def bounded_receive():
                nonlocal delivered
                if not delivered:
                    delivered = True
                    return {
                        "type": "http.request",
                        "body": bytes(body),
                        "more_body": False,
                    }
                return await receive()

            async def no_store_send(message):
                if message["type"] == "http.response.start":
                    message.setdefault("headers", []).append(
                        (b"cache-control", b"no-store")
                    )
                await send(message)

            scope.setdefault("state", {})["mcp_client_id"] = identity
            await self.app(scope, bounded_receive, no_store_send)
        finally:
            self._active -= 1
