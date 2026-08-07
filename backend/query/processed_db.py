"""
**Author**:
    Fitz Koch
**Created**:
    2026-06-01
**Description**:
    Pull in all the parquet files into active api.
    Uses pre-run ETL from consolidate.py in the build section.
"""

import logging
import os
from pathlib import Path

import duckdb

logger = logging.getLogger(__name__)
proc_dir = Path(__file__).resolve().parent.parent / "Data" / "_Processed"
DATA_DIR = Path(os.environ.get("DATA_DIR", proc_dir))


def _load_spatial(con: duckdb.DuckDBPyConnection) -> None:
    """Load the spatial extension, installing it first if necessary."""
    try:
        con.execute("LOAD spatial")
    except Exception:
        con.execute("INSTALL spatial")
        con.execute("LOAD spatial")


# def _build() -> duckdb.DuckDBPyConnection:
#     con = duckdb.connect(":memory:")
#     _load_spatial(con)

#     parquets = sorted(proc_dir.rglob("*.parquet"))
#     if not parquets:
#         logger.warning("No parquet files found under %s", proc_dir)

#     for path in parquets:
#         name = f"{path.parent.name}_{path.stem}"
#         con.execute(f"""--sql
#             CREATE TABLE "{name}" AS SELECT * FROM read_parquet('{path}')
#         """)
#         logger.info("Loaded table %s from %s", name, path)
#     return con


def _build() -> duckdb.DuckDBPyConnection:
    path = Path(DATA_DIR / "all_data.duckdb")
    con = duckdb.connect(path, read_only=True)
    _load_spatial(con)
    return con


# def _build_DB_from_lake() -> duckdb.DuckDBPyConnection:
#     """
#     Builds tables in `all_data.duckdb` by pulling directly from the
#     CLEANED schema in the DuckLake, instead of reading source CSVs/Parquets.
#     """
#     path = Path(proc_dir / "all_data.duckdb")
#     con = duckdb.connect(path, read_only=True)
#     _load_spatial(con)


DB = _build()
