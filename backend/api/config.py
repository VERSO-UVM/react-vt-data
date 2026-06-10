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
schema = json.loads(SCHEMA_PATH.read_text())

# Schema Orientation:

## primary dataset: the dataset to be joined onto. falls back to "default."
#       This what the 'main logic' is done to in the SELECT clause of the SQL query.
####  secondary dataset: the dataset we're using to filter the primary dataset
###### join_key: the column to join on. see FilterSource in request_models.py
###### join_type: what type of join, either SQL standard (eg left) or spatial
###### columns: ORDERED {label, column} pairs.
#       The order is the filter cascade order; the label is what frontend shows;
#       the column is what is sent back to the sql
