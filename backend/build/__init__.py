from pathlib import Path

import duckdb

ROOT = (
    Path(__file__).resolve().parent
)  # backend/build/  → use .parent.parent for backend/
BACKEND = ROOT.parent  # backend/
data_dir = BACKEND / "Data"
CON = duckdb.connect()
CON.execute("LOAD spatial")
