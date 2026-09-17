"""Environment configuration for local and deployed MCP transports."""

from __future__ import annotations

import ipaddress
import os
from collections.abc import Mapping
from dataclasses import dataclass, field
from pathlib import Path

DEVELOPMENT_TOKEN = "vt-data-local-development-token"
MCP_PATH = "/api/mcp"
LOCAL_HOSTS = (
    "localhost",
    "localhost:*",
    "127.0.0.1",
    "127.0.0.1:*",
    "[::1]",
    "[::1]:*",
)
LOCAL_ORIGINS = (
    "http://localhost",
    "http://localhost:*",
    "http://127.0.0.1",
    "http://127.0.0.1:*",
    "http://[::1]",
    "http://[::1]:*",
)


def is_loopback(host: str) -> bool:
    if host == "localhost":
        return True
    try:
        return ipaddress.ip_address(host.strip("[]")).is_loopback
    except ValueError:
        return False


def _csv(value: str) -> tuple[str, ...]:
    return tuple(part.strip() for part in value.split(",") if part.strip())


@dataclass(frozen=True)
class MCPSettings:
    auth_mode: str = "none"
    bearer_tokens: tuple[str, ...] = field(default=(), repr=False)
    allowed_hosts: tuple[str, ...] = LOCAL_HOSTS
    allowed_origins: tuple[str, ...] = LOCAL_ORIGINS
    warehouse_path: Path | None = None
    max_rows: int = 1000
    max_bytes: int = 1_000_000
    query_timeout: float = 20.0
    max_concurrency: int = 4
    rate_limit: int = 120
    max_request_bytes: int = 65_536
    request_body_timeout: float = 10.0

    def __post_init__(self) -> None:
        if self.auth_mode not in {"none", "development", "bearer"}:
            raise ValueError("MCP_AUTH_MODE must be none, development, or bearer")
        if self.auth_mode == "bearer":
            if not self.bearer_tokens:
                raise ValueError("MCP_AUTH_MODE=bearer requires MCP_BEARER_TOKENS")
            if len(self.bearer_tokens) > 32:
                raise ValueError("MCP_BEARER_TOKENS supports at most 32 active tokens")
            if any(
                len(token) < 32
                or len(token) > 512
                or not token.isascii()
                or any(char.isspace() for char in token)
                or token == DEVELOPMENT_TOKEN
                for token in self.bearer_tokens
            ):
                raise ValueError(
                    "Production bearer tokens must contain 32–512 ASCII characters, "
                    "have no whitespace, and differ from the development token"
                )
            if len(set(self.bearer_tokens)) != len(self.bearer_tokens):
                raise ValueError("MCP_BEARER_TOKENS contains duplicate tokens")
        if not self.allowed_hosts or any(value == "*" for value in self.allowed_hosts):
            raise ValueError("MCP_ALLOWED_HOSTS must explicitly name allowed hosts")
        if any(value == "*" for value in self.allowed_origins):
            raise ValueError("MCP_ALLOWED_ORIGINS cannot contain a wildcard origin")
        for name, value, minimum, maximum in (
            ("MCP_MAX_ROWS", self.max_rows, 1, 1000),
            ("MCP_MAX_BYTES", self.max_bytes, 4096, 1_000_000),
            ("MCP_QUERY_TIMEOUT", self.query_timeout, 0.1, 120),
            ("MCP_MAX_CONCURRENCY", self.max_concurrency, 1, 32),
            ("MCP_RATE_LIMIT", self.rate_limit, 1, 100_000),
            ("MCP_MAX_REQUEST_BYTES", self.max_request_bytes, 1024, 1_000_000),
            ("MCP_REQUEST_BODY_TIMEOUT", self.request_body_timeout, 0.1, 120),
        ):
            if not minimum <= value <= maximum:
                raise ValueError(f"{name} must be between {minimum} and {maximum}")

    @property
    def tokens(self) -> tuple[str, ...]:
        if self.auth_mode == "development":
            return (DEVELOPMENT_TOKEN,)
        return self.bearer_tokens if self.auth_mode == "bearer" else ()

    def validate_network(
        self, host: str = "127.0.0.1", *, mounted: bool = False
    ) -> None:
        if mounted and self.auth_mode != "bearer":
            raise ValueError(
                "MCP_ENABLED requires MCP_AUTH_MODE=bearer in the shared API; "
                "use python -m mcp_server for local no-auth/development testing"
            )
        if self.auth_mode != "bearer" and not is_loopback(host):
            raise ValueError("No-auth and development-token MCP must bind to loopback")

    @classmethod
    def from_env(cls, environ: Mapping[str, str] | None = None) -> MCPSettings:
        env = os.environ if environ is None else environ
        data_dir = env.get("DATA_DIR")
        path = Path(data_dir) / "warehouse.duckdb" if data_dir else None
        try:
            return cls(
                auth_mode=env.get("MCP_AUTH_MODE", "none").lower(),
                bearer_tokens=_csv(env.get("MCP_BEARER_TOKENS", "")),
                allowed_hosts=_csv(env["MCP_ALLOWED_HOSTS"])
                if env.get("MCP_ALLOWED_HOSTS")
                else LOCAL_HOSTS,
                allowed_origins=_csv(env["MCP_ALLOWED_ORIGINS"])
                if "MCP_ALLOWED_ORIGINS" in env
                else LOCAL_ORIGINS,
                warehouse_path=path,
                max_rows=int(env.get("MCP_MAX_ROWS", "1000")),
                max_bytes=int(env.get("MCP_MAX_BYTES", "1000000")),
                query_timeout=float(env.get("MCP_QUERY_TIMEOUT", "20")),
                max_concurrency=int(env.get("MCP_MAX_CONCURRENCY", "4")),
                rate_limit=int(env.get("MCP_RATE_LIMIT", "120")),
                max_request_bytes=int(env.get("MCP_MAX_REQUEST_BYTES", "65536")),
                request_body_timeout=float(env.get("MCP_REQUEST_BODY_TIMEOUT", "10")),
            )
        except (TypeError, ValueError) as exc:
            # Numeric parse failures must not echo environment contents (secrets).
            if str(exc).startswith(("invalid literal", "could not convert")):
                raise ValueError(
                    "MCP numeric configuration contains an invalid value"
                ) from None
            raise
