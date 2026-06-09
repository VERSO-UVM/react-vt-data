"""
**Author**:
    Fitz Koch
**Created**:
    2026-06-01
**Description**:
    Pulls all sql into a single duckdb file for investigation with dbeaver, etc.
"""

from pathlib import Path

import duckdb

db = duckdb.connect("backend/Data/_Processed/all_data.duckdb")
for path in Path("backend/Data/_Processed").rglob("*.parquet"):
    name = f"{path.parent.name}_{path.stem}"
    db.execute(f"CREATE TABLE {name} AS SELECT * FROM read_parquet('{path}')")
