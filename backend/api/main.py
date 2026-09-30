"""
Run from root/backend:

    export ALLOW_DEV_CORS=1
    uv run uvicorn api.main:app --reload --port 6767

Docs at http://localhost:6767/api/docs

In containers, nginx proxies /api/ here, so the browser only ever
talks to the frontend's origin.
"""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from posthog import Posthog

from api.routes.get_routes import all_get_routers
from api.routes.post_routes import all_post_routers


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create the PostHog client if configured; analytics is off otherwise."""
    token = os.environ.get("POSTHOG_PROJECT_TOKEN")
    host = os.environ.get("POSTHOG_HOST")
    app.state.posthog = (
        Posthog(project_api_key=token, host=host) if token and host else None
    )
    yield
    if app.state.posthog:
        app.state.posthog.shutdown()  # flushes queued events


app = FastAPI(
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)



@app.middleware("http")
async def track_api_calls(request: Request, call_next):
    """One anonymous event per API POST, tagged with the route template."""
    response = await call_next(request)
    client = app.state.posthog
    route = request.scope.get("route")
    if client and request.method == "POST" and route:
        client.capture(
            "api_request",
            properties={
                "$process_person_profile": False,
                "route": route.path,
                "status": response.status_code,
            },
        )
    return response


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
