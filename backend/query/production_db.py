"""
**Author**:
    Fitz Koch
**Created**:
    2026-06-01
**Updated**:
    2026-08-26
**Description**:
    Establishes the DB connection to the finalized
    database, `warehouse.duckdb`, which is derived
    from the CLEANED DuckLake tables.
"""

import logging
import os
from pathlib import Path

import duckdb

logger = logging.getLogger(__name__)
proc_dir = Path(__file__).resolve().parent.parent / "Data" / "_Processed"

BACKEND_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = Path(os.environ.get("DATA_DIR", BACKEND_DIR / "Data"))


def _load_spatial(con: duckdb.DuckDBPyConnection) -> None:
    """Load the spatial extension, installing it first if necessary."""
    try:
        con.execute("LOAD spatial")
    except Exception:
        con.execute("INSTALL spatial")
        con.execute("LOAD spatial")


def _build_etl_db() -> duckdb.DuckDBPyConnection:
    path = Path(DATA_DIR / "warehouse.duckdb")
    con = duckdb.connect(path, read_only=True)
    _load_spatial(con)
    return con


DB = _build_etl_db()
