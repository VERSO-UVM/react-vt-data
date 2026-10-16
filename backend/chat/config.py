"""Environment configuration for the data chat agent (see docs/architecture/data-chat.md)."""

from __future__ import annotations

import os
from collections.abc import Mapping
from dataclasses import dataclass
from pathlib import Path

# Models are reached through OpenRouter, so trying a different one is a config
# change. Haiku 5.5 won the eval comparison against GPT-6.1 Sol and DeepSeek V4.1
# Flash (docs/guides/chat-evals.md).
DEFAULT_MODEL = "anthropic/claude-haiku-5.5"

# OpenRouter routing for every chat and judge request: skip providers that
# store or train on inputs, since users' questions and our data go to them.
PROVIDER_ROUTING = {"data_collection": "deny"}


def model_name(model: str) -> str:
    """A bare OpenRouter slug ("openai/gpt-6.1-sol") or any Pydantic AI model
    string ("openrouter:...", "openai:...", "demo") to a Pydantic AI string."""
    if model == "demo" or ":" in model:
        return model
    return f"openrouter:{model}"


@dataclass(frozen=True)
class ChatSettings:
    # An OpenRouter slug or any Pydantic AI model string (see model_name);
    # "demo" runs a scripted offline model (chat/demo.py) so the UI can be
    # built without an API key.
    model: str = DEFAULT_MODEL
    warehouse_path: Path | None = None
    # Per-turn bounds. v0 has no monthly spend cap, so these and the rate limit
    # are the only cost controls in our code.
    max_model_requests: int = 20
    max_tool_calls: int = 30
    max_output_tokens: int = 40_000
    # Rows of each data tool result the model sees; the browser gets full rows
    # by reference through /api/chat/data.
    preview_rows: int = 20
    # Client-supplied history bounds (the server stores no conversation state).
    max_history_messages: int = 20
    max_message_chars: int = 4_000
    max_history_chars: int = 40_000
    # Questions per client IP per rolling hour, per worker process.
    rate_limit: int = 30
    # Rows /api/chat/data returns for one chart reference.
    chart_max_rows: int = 5_000

    @classmethod
    def from_env(cls, environ: Mapping[str, str] | None = None) -> ChatSettings:
        env = os.environ if environ is None else environ
        data_dir = env.get("DATA_DIR")
        try:
            return cls(
                model=env.get("CHAT_MODEL", DEFAULT_MODEL),
                warehouse_path=Path(data_dir) / "warehouse.duckdb"
                if data_dir
                else None,
                max_model_requests=int(env.get("CHAT_MAX_MODEL_REQUESTS", "20")),
                max_tool_calls=int(env.get("CHAT_MAX_TOOL_CALLS", "30")),
                max_output_tokens=int(env.get("CHAT_MAX_OUTPUT_TOKENS", "40000")),
                preview_rows=int(env.get("CHAT_PREVIEW_ROWS", "20")),
                max_history_messages=int(env.get("CHAT_MAX_HISTORY_MESSAGES", "20")),
                max_message_chars=int(env.get("CHAT_MAX_MESSAGE_CHARS", "4000")),
                max_history_chars=int(env.get("CHAT_MAX_HISTORY_CHARS", "40000")),
                rate_limit=int(env.get("CHAT_RATE_LIMIT", "30")),
                chart_max_rows=int(env.get("CHAT_CHART_MAX_ROWS", "5000")),
            )
        except ValueError:
            # Don't echo environment contents, which can sit next to secrets.
            raise ValueError(
                "Chat numeric configuration contains an invalid value"
            ) from None
