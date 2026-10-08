"""
Run from root/backend:

    export ALLOW_DEV_CORS=1
    uv run uvicorn api.main:app --reload --port 6767

Docs at http://localhost:6767/api/docs

In containers, nginx proxies /api/ here, so the browser only ever
talks to the frontend's origin.
"""

import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from api.routes.get_routes import all_get_routers
from api.routes.post_routes import all_post_routers

app = FastAPI(docs_url="/api/docs", openapi_url="/api/openapi.json")

# Map/GeoJSON responses (parcels, zoning, wastewater) run several MB
# uncompressed — nginx gzips these in the containers, but `uvicorn --reload`
# local dev has nothing else in front of it, so compress here too.
app.add_middleware(GZipMiddleware, minimum_size=1000)


@app.middleware("http")
async def cache_get_responses(request: Request, call_next):
    # Data only changes when the ETL rebuilds the warehouse, so GETs are safe
    # to cache briefly in the browser / nginx.
    response = await call_next(request)
    if request.method == "GET" and response.status_code == 200:
        response.headers.setdefault("Cache-Control", "public, max-age=3600")
    return response


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
