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

db = duckdb.connect("Data/_Processed/all_data.duckdb")
db.execute("INSTALL SPATIAL")
db.execute("LOAD SPATIAL")

for path in Path("Data/_Processed").rglob("*.parquet"):
    name = f"{path.parent.name}_{path.stem}"
    db.execute(
        f"CREATE OR REPLACE TABLE {name} AS SELECT * FROM read_parquet('{path}')"
    )
