"""
**Author**:
    Fitz Koch
**Created**:
    2026-06-10
**Description**:
    Sets the schema path for import across API.
"""

import json
from pathlib import Path

SCHEMA_PATH = Path(__file__).resolve().parent / "schema.json"
schema: dict = json.loads(SCHEMA_PATH.read_text())
