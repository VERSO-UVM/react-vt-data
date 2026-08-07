"""
Run from root/backend:

    export ALLOW_DEV_CORS=1
    uv run uvicorn api.main:app --reload --port 6767

Docs at http://localhost:6767/api/docs

In containers, nginx proxies /api/ here, so the browser only ever
talks to the frontend's origin.
"""

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes.get_routes import all_get_routers
from api.routes.post_routes import all_post_routers

app = FastAPI(docs_url="/api/docs", openapi_url="/api/openapi.json")

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
