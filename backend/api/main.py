"""
run from root/backend


uvicorn api.main:app --reload --port 6767
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes.get_routes import all_get_routers
from api.routes.post_routes import all_post_routers

app = FastAPI()
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:6767",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for r in all_get_routers:
    app.include_router(r, prefix="/get")

for r in all_post_routers:
    app.include_router(r, prefix="/post")