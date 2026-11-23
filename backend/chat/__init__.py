"""Data chat agent (docs/architecture/data-chat.md)."""

import os

# Pydantic AI prints a promotional banner on first use; keep server logs clean.
os.environ.setdefault("PYDANTIC_AI_NO_BANNER", "1")
