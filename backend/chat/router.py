"""HTTP routes for the data chat. Mounted only when CHAT_ENABLED is set.

Streaming protocol for POST /api/chat: server-sent events, one JSON object per
``data:`` line, each with a ``type``:

- ``text``: ``{delta}``, a chunk of the answer's markdown
- ``tool_call``: ``{id, name, args}``, the agent started a tool
- ``tool_result``: ``{id, name, ok, error}``, that tool finished
- ``chart``: ``{id, chart}``, a ChartSpec; fetch its rows from /api/chat/data
- ``done``: ``{usage}``, the turn finished
- ``error``: ``{message}``, the turn stopped; the message is safe to display
"""

from __future__ import annotations

import json
import threading
import time
from collections import defaultdict, deque
from typing import Literal

import anyio
from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, model_validator

from chat.agent import build_agent, stream_answer, to_history, tool_error
from chat.charts import DataRef, resolve_rows
from chat.config import ChatSettings
from data_tools.service import DataToolService


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1)


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1)

    @model_validator(mode="after")
    def ends_with_question(self):
        if self.messages[-1].role != "user":
            raise ValueError("The last message must be the user's question")
        return self


class RateLimiter:
    """Rolling one-hour window per client, in process memory.

    Each worker keeps its own counts and they reset on restart; a shared limit
    waits for the storage decision (docs/architecture/data-chat.md).
    """

    def __init__(self, per_hour: int, window: float = 3600.0):
        self.per_hour = per_hour
        self.window = window
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def allow(self, client: str) -> bool:
        now = time.monotonic()
        with self._lock:
            hits = self._hits[client]
            while hits and now - hits[0] > self.window:
                hits.popleft()
            if len(hits) >= self.per_hour:
                return False
            hits.append(now)
            return True


def bounded_history(
    messages: list[ChatMessage], settings: ChatSettings
) -> tuple[str, list[dict[str, str]]]:
    """Split off the question and keep the newest history that fits the bounds."""
    question = messages[-1].content
    if len(question) > settings.max_message_chars:
        raise HTTPException(
            413, f"Questions are limited to {settings.max_message_chars} characters"
        )
    kept: list[dict[str, str]] = []
    total = len(question)
    for message in reversed(messages[:-1][-settings.max_history_messages :]):
        content = message.content[: settings.max_message_chars]
        total += len(content)
        if total > settings.max_history_chars:
            break
        kept.append({"role": message.role, "content": content})
    kept.reverse()
    # History must alternate starting from a user turn.
    while kept and kept[0]["role"] != "user":
        kept.pop(0)
    return question, kept


def create_router(
    settings: ChatSettings | None = None, service: DataToolService | None = None
) -> APIRouter:
    settings = settings or ChatSettings.from_env()
    service = service or DataToolService(settings.warehouse_path)
    agent = build_agent(settings, service)
    limiter = RateLimiter(settings.rate_limit)
    router = APIRouter(prefix="/chat", tags=["chat"])

    @router.get("/status")
    def status(response: Response):
        # The API caches GETs for an hour; flipping the flag must show at once.
        response.headers["Cache-Control"] = "no-store"
        # v0 has no spend cap, so chat is always available while enabled.
        return {"enabled": True, "available": True, "resets_at": None}

    @router.post("")
    async def chat(body: ChatRequest, request: Request):
        question, history = bounded_history(body.messages, settings)
        client = request.client.host if request.client else "unknown"
        if not limiter.allow(client):
            raise HTTPException(
                429, "You've reached the hourly question limit. Try again later."
            )

        async def events():
            async for event in stream_answer(
                agent, settings, question, to_history(history)
            ):
                yield f"data: {json.dumps(event, default=str)}\n\n"

        return StreamingResponse(
            events(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-store", "X-Accel-Buffering": "no"},
        )

    @router.post("/data")
    async def chart_data(ref: DataRef):
        try:
            return await anyio.to_thread.run_sync(
                resolve_rows, service, ref, settings.chart_max_rows
            )
        except Exception as exc:  # noqa: BLE001 -- show a safe message only
            raise HTTPException(400, tool_error(exc, ref.tool)) from None

    return router
