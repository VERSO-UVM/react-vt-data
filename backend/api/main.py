"""
Run from root/backend:

    export ALLOW_DEV_CORS=1
    uv run uvicorn api.main:app --reload --port 6767

Docs at http://localhost:6767/api/docs

In containers, nginx proxies /api/ here, so the browser only ever
talks to the frontend's origin.
"""

import atexit
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from opentelemetry.exporter.otlp.proto.http._log_exporter import (
    OTLPLogExporter,
)
from opentelemetry.sdk._logs import LoggerProvider, LoggingHandler
from opentelemetry.sdk._logs.export import BatchLogRecordProcessor
from posthog import Posthog

from api.config import get_settings
from api.routes.get_routes import all_get_routers
from api.routes.post_routes import all_post_routers

POSTHOG_LOGGER_NAME = "posthog.exporter"
posthog_logs = logging.getLogger(POSTHOG_LOGGER_NAME)


def configure_posthog_logs(host: str, project_token: str) -> LoggerProvider:
    """Export only records from the dedicated PostHog logger via OTLP."""
    logger_provider = LoggerProvider()

    exporter = OTLPLogExporter(
        endpoint=f"{host.rstrip('/')}/i/v1/logs",
        headers={"Authorization": f"Bearer {project_token}"},
    )
    logger_provider.add_log_record_processor(BatchLogRecordProcessor(exporter))

    posthog_logs.setLevel(logging.INFO)
    posthog_logs.addHandler(LoggingHandler(logger_provider=logger_provider))
    posthog_logs.propagate = False
    return logger_provider


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize and flush the process-wide PostHog client."""
    settings = get_settings()
    project_token = settings.posthog_project_token
    host = settings.posthog_host

    if not project_token or not host:
        if settings.debug:
            missing_variable = (
                "POSTHOG_PROJECT_TOKEN" if not project_token else "POSTHOG_HOST"
            )
            raise RuntimeError(
                f"{missing_variable} variable required by PostHog is missing or "
                "un-configured, this causes events to be silently missed. This "
                f"error stops appearing once {missing_variable} is configured"
            )
        app.state.posthog_client = None
        yield
        return

    posthog_client = Posthog(
        project_api_key=project_token,
        host=host,
        enable_exception_autocapture=True,
    )
    app.state.posthog_client = posthog_client
    atexit.register(posthog_client.shutdown)
    log_provider = configure_posthog_logs(host, project_token)
    posthog_logs.info(
        "api_started",
        extra={"event": "api_started", "service": "vermont-data-api"},
    )

    try:
        yield
    finally:
        posthog_logs.info(
            "api_stopping",
            extra={"event": "api_stopping", "service": "vermont-data-api"},
        )
        posthog_client.flush()
        log_provider.shutdown()


app = FastAPI(
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

# Map/GeoJSON responses (parcels, zoning, wastewater) run several MB
# uncompressed — nginx gzips these in the containers, but `uvicorn --reload`
# local dev has nothing else in front of it, so compress here too.
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Only needed for `next dev`, which bypasses the nginx proxy.
# In the containers everything is same-origin and this does nothing.
if os.environ.get("ALLOW_DEV_CORS"):
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000", "http://localhost:5100"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

for r in all_get_routers:
    app.include_router(r, prefix="/api")

for r in all_post_routers:
    app.include_router(r, prefix="/api")

# MCP is opt-in and isolated from the existing application routes. Mounted mode
# requires production bearer tokens; the standalone runner supports local testing.
if os.environ.get("MCP_ENABLED", "").lower() in {"1", "true", "yes"}:
    from mcp_server.server import attach_mcp

    attach_mcp(app)
