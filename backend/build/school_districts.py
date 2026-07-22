"""
**Author**:
    Atticus Tarleton
**Created**:
    2026-07-22
**Description**:
    Build script to convert the school district files into SQL tables.
"""

import os
from pathlib import Path

import duckdb
import pandas as pd

_project_root = Path.cwd()
while not (_project_root / "api").exists():
    _project_root = _project_root.parent
os.chdir(_project_root)
print(os.getcwd())

# globals
con = duckdb.connect()
proc_dir = Path("Data/_Processed/school_districts")
data_dir = Path("Data")
school_districts_data = data_dir / "school-districts"

# hardcoded specifics:
## school district info table
district_info_cols = [
    "OBJECTID",
    "SCHOOLDIST",
    "DISTNAME",
    "PopDensity",
    "Shape__Area",
    "geometry",
]

## school union info table
union_info_cols = [
    "OBJECTID",
    "UNIONTYPE",
    "SUNION",
    "SUPERNAME",
]

## school district table creation
def load_school_district_data():
    school_districts_data_location = school_districts_data / "school_districts.parquet"
    con.execute("LOAD spatial")

    con.execute(f"""--sql
      CREATE OR REPLACE VIEW school_districts AS
      SELECT * FROM read_parquet('{school_districts_data_location}')
    """)

def build_school_district_info_table():
    school_dist_info_string = ", ".join(district_info_cols)

    con.execute(f"""--sql
      CREATE OR REPLACE VIEW school_district_info AS
      SELECT {school_dist_info_string}
      FROM school_districts
    """)


def build_school_union_info_table():
    school_union_info_string = ", ".join(union_info_cols)

    con.execute(f"""--sql
      CREATE OR REPLACE VIEW school_union_info AS
      SELECT {school_union_info_string}
      FROM school_districts
    """)

def save_school_district_tables():
    load_school_district_data()


    build_school_district_info_table()
    build_school_union_info_table()

    for table in [
        "school_district_info",
        "school_union_info",
    ]:
        con.execute(
            f"COPY (SELECT * FROM {table}) TO '{proc_dir / f'{table}.parquet'}' "
        )

## Putting everything together
def main():
    proc_dir.mkdir(parents=True, exist_ok=True)
    con.execute("LOAD spatial")

    save_school_district_tables()


if __name__ == "__main__":
    main()