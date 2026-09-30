"""
**Author**:
    Fitz Koch
**Created**:
    2026-06-10
**Description**:
    Sets the schema path for import across API.
"""

import json
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

SCHEMA_PATH = Path(__file__).resolve().parent / "schema.json"
schema: dict = json.loads(SCHEMA_PATH.read_text())


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(extra="ignore")

    debug: bool = False
    posthog_project_token: str | None = None
    posthog_host: str | None = None


@lru_cache
def get_settings() -> Settings:
    """Get cached application settings."""
    return Settings()
