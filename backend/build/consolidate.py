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

for db_path in [
    "Data/_Processed/all_data.duckdb",
    "Data/_Processed/all_data-copy.duckdb",
]:
    path = Path(__file__).parent.parent / db_path
    db = duckdb.connect(str(db_path))
    db.execute("INSTALL SPATIAL")
    db.execute("LOAD SPATIAL")
    for path in Path("Data/_Processed").rglob("*.parquet"):
        name = f"{path.parent.name}_{path.stem}"
        db.execute(
            f"CREATE OR REPLACE TABLE {name} AS SELECT * FROM read_parquet('{path}')"
        )
