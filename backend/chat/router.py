"""HTTP routes for the data chat. Mounted only when CHAT_ENABLED is set, and
when CHAT_ACCESS_CODE is set the chat and data routes need the cookie that
POST /api/chat/unlock gives for the right code (chat/access.py).

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
from typing import Any, Literal

import anyio
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, model_validator

from chat import access
from chat.agent import (
    AGENT_TOOLS,
    build_agent,
    stream_answer,
    to_history,
    tool_error,
)
from chat.charts import DataRef, resolve_rows
from chat.config import ChatSettings
from data_tools.service import DataToolService


class ToolUse(BaseModel):
    """A tool call an earlier answer made, sent back so follow-ups can reuse
    its dataset, places, and filters (agent.to_history)."""

    name: str = Field(max_length=50)
    args: dict[str, Any] = Field(default_factory=dict)


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1)
    # Assistant messages only; ignored on user messages.
    tools: list[ToolUse] = Field(default_factory=list, max_length=100)


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1)

    @model_validator(mode="after")
    def ends_with_question(self):
        if self.messages[-1].role != "user":
            raise ValueError("The last message must be the user's question")
        return self


class UnlockRequest(BaseModel):
    code: str = Field(max_length=200)


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


def replayable_tools(
    message: ChatMessage, settings: ChatSettings
) -> list[dict[str, Any]]:
    """The message's tool calls that are safe and small enough to replay.

    The client sends these, so they are held to the agent's own tool names and
    a size bound. Dropping one only costs the model a rediscovery.
    """
    if message.role != "assistant":
        return []
    tools = [
        {"name": tool.name, "args": tool.args}
        for tool in message.tools
        if tool.name in AGENT_TOOLS
        and len(json.dumps(tool.args, default=str)) <= settings.max_history_tool_chars
    ]
    return tools[-settings.max_history_tool_calls :]


def bounded_history(
    messages: list[ChatMessage], settings: ChatSettings
) -> tuple[str, list[dict[str, Any]]]:
    """Split off the question and keep the newest history that fits the bounds."""
    question = messages[-1].content
    if len(question) > settings.max_message_chars:
        raise HTTPException(
            413, f"Questions are limited to {settings.max_message_chars} characters"
        )
    kept: list[dict[str, Any]] = []
    total = len(question)
    for message in reversed(messages[:-1][-settings.max_history_messages :]):
        content = message.content[: settings.max_message_chars]
        tools = replayable_tools(message, settings)
        total += len(content) + len(json.dumps(tools, default=str)) * bool(tools)
        if total > settings.max_history_chars:
            break
        kept.append({"role": message.role, "content": content, "tools": tools})
    kept.reverse()
    # History must alternate starting from a user turn.
    while kept and kept[0]["role"] != "user":
        kept.pop(0)
    return question, kept


# Code attempts per client IP per rolling hour, so the code can't be guessed by
# trying many.
UNLOCK_ATTEMPTS = 10


def client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def create_router(
    settings: ChatSettings | None = None, service: DataToolService | None = None
) -> APIRouter:
    settings = settings or ChatSettings.from_env()
    service = service or DataToolService(settings.warehouse_path)
    agent = build_agent(settings, service)
    limiter = RateLimiter(settings.rate_limit)
    unlock_limiter = RateLimiter(UNLOCK_ATTEMPTS)
    router = APIRouter(prefix="/chat", tags=["chat"])

    def unlocked(request: Request) -> bool:
        code = settings.access_code
        return code is None or access.token_valid(
            code, request.cookies.get(access.COOKIE_NAME)
        )

    def require_access(request: Request) -> None:
        if not unlocked(request):
            raise HTTPException(401, "Enter the access code to use chat.")

    def status_body(is_unlocked: bool) -> dict:
        # v0 has no spend cap, so chat is always available while enabled.
        return {
            "enabled": True,
            "available": True,
            "resets_at": None,
            "unlocked": is_unlocked,
        }

    @router.get("/status")
    def status(request: Request, response: Response):
        # The API caches GETs for an hour; flipping the flag (or entering the
        # code) must show at once.
        response.headers["Cache-Control"] = "no-store"
        return status_body(unlocked(request))

    @router.post("/unlock")
    def unlock(body: UnlockRequest, request: Request, response: Response):
        code = settings.access_code
        if code is None:
            return status_body(True)
        # Every attempt counts, checked before the code so a client over the
        # limit learns nothing even from the right one.
        if not unlock_limiter.allow(client_ip(request)):
            raise HTTPException(429, "Too many tries. Try again in an hour.")
        if not access.code_matches(code, body.code):
            raise HTTPException(403, "That code didn't work.")
        max_age = settings.access_days * 24 * 3600
        response.set_cookie(
            access.COOKIE_NAME,
            access.issue_token(code, max_age),
            max_age=max_age,
            path="/api/chat",
            httponly=True,
            samesite="lax",
            # nginx passes on the public scheme; local http dev can't keep a
            # Secure cookie in every browser.
            secure=request.url.scheme == "https",
        )
        return status_body(True)

    @router.post("", dependencies=[Depends(require_access)])
    async def chat(body: ChatRequest, request: Request):
        question, history = bounded_history(body.messages, settings)
        if not limiter.allow(client_ip(request)):
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

    @router.post("/data", dependencies=[Depends(require_access)])
    async def chart_data(ref: DataRef):
        try:
            return await anyio.to_thread.run_sync(
                resolve_rows, service, ref, settings.chart_max_rows
            )
        except Exception as exc:  # noqa: BLE001 -- show a safe message only
            raise HTTPException(400, tool_error(exc, ref.tool)) from None

    return router
