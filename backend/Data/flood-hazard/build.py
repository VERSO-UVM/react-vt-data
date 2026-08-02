import duckdb
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent
PARQUET = DATA_DIR / "vt-flood-hazard.parquet"
SQL_DIR = DATA_DIR / "sql"

def main():
    con = duckdb.connect(DATA_DIR / "flood.db")

    # Load raw table from parquet
    con.execute(f"""
        CREATE OR REPLACE TABLE raw AS
        SELECT *
        FROM read_parquet('{PARQUET}')
    """)

    # Run SQL files in order
    for name in ["info.sql", "geom.sql", "build.sql"]:
        con.execute((SQL_DIR / name).read_text())

    print("Flood hazard tables built.")

if __name__ == "__main__":
    main()
