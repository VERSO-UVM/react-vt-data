"""A shared access code for the data chat, until there are user accounts.

Entering the code (POST /api/chat/unlock) sets a signed, HttpOnly cookie that
the chat routes require. The signing key comes from the code itself, so
changing CHAT_ACCESS_CODE signs everyone out with no other secret to manage.
This gates spend, not data: anyone given the code can pass it on, and access
can only be revoked for everyone at once.
"""

from __future__ import annotations

import hashlib
import hmac
import time

COOKIE_NAME = "vt_chat_access"


def _key(code: str) -> bytes:
    return hashlib.sha256(f"vt-data-chat-access:{code}".encode()).digest()


def code_matches(code: str, submitted: str) -> bool:
    # Constant-time, so response timing doesn't hint at the code.
    return hmac.compare_digest(code.encode(), submitted.strip().encode())


def issue_token(code: str, max_age: int, now: float | None = None) -> str:
    """A cookie value that stays valid for max_age seconds."""
    expires = int((time.time() if now is None else now) + max_age)
    signature = hmac.new(_key(code), str(expires).encode(), "sha256").hexdigest()
    return f"{expires}.{signature}"


def token_valid(code: str, token: str | None, now: float | None = None) -> bool:
    if not token:
        return False
    expires, _, signature = token.partition(".")
    if not expires.isdigit():
        return False
    expected = hmac.new(_key(code), expires.encode(), "sha256").hexdigest()
    if not hmac.compare_digest(expected, signature):
        return False
    return int(expires) > (time.time() if now is None else now)
