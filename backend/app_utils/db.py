"""
Central DuckDB connection for the API server.

Opens vt_data.duckdb read-only. Build it first uv.
"""

import logging
from pathlib import Path

import duckdb

logger = logging.getLogger(__name__)

_DB_PATH = Path(__file__).resolve().parent.parent / "Data" / "vt_data.duckdb"

if not _DB_PATH.exists():
    raise RuntimeError(
        f"DuckDB database not found at {_DB_PATH}.\n"
        "Build it with: conda run -n leahy_data python setup_scripts/build_db.py"
    )

DB = duckdb.connect(str(_DB_PATH), read_only=True)
logger.info("Opened DuckDB database: %s", _DB_PATH)
