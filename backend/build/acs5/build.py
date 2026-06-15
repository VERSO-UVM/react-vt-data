"""
**Author**:
    Ian Sargent
**Created**:
    2026-06-15
**Description**:
    Build script to convert the acs5 tidy data files into SQL tables.
"""

import os
from pathlib import Path

import duckdb
import pandas as pd

_project_root = Path.cwd()
while not (_project_root / "backend").exists():
    _project_root = _project_root.parent
os.chdir(_project_root)
print(os.getcwd())


# globals
con = duckdb.connect()
proc_dir = Path("backend/Data/Census/ACS_5")
data_dir = Path("backend/Data")
sql_path = Path("backend/build/acs5/sql")

# functions:


def data_load():
    parquet_files = list((data_dir / "Census" / "ACS_5").glob("*.parquet"))

    for file in parquet_files:
        table_name = file.stem

        con.execute(f"""
            CREATE OR REPLACE VIEW {table_name}_raw AS
            SELECT *
            FROM read_parquet('{file}')
        """)


def build_tables():
    parquet_files = list((data_dir / "Census" / "ACS_5").glob("*.parquet"))

    for file in parquet_files:
        table_name = file.stem

        con.execute(f"""
            CREATE OR REPLACE TABLE {table_name} AS
            SELECT *
            FROM {table_name}_raw
        """)


def main():
    data_load()
    build_tables()
    proc_dir.mkdir(parents=True, exist_ok=True)
    tables = ["demographics", "education", "economic", "housing"]
    for table in tables:
        con.execute(
            f"""COPY (SELECT * FROM {table}) TO '{proc_dir / f'{table}.parquet'}'
             (FORMAT PARQUET) 
             """
        )


if __name__ == "__main__":
    main()
