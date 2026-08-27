from pathlib import Path

import duckdb

from build.core_functions import bin_measures

ROOT = (
    Path(__file__).resolve().parent
)  # backend/build/  → use .parent.parent for backend/
BACKEND = ROOT.parent  # backend/
data_dir = BACKEND / "Data"
CON = duckdb.connect()
CON.execute("INSTALL spatial")
CON.execute("LOAD spatial")
SQL_DIR = BACKEND / "build" / "sql"
