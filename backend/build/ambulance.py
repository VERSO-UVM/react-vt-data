"""
**Author**:
    Atticus Tarleton
**Created**:
    2026-07-20
**Description**:
    Build script to convert the ambulance service area files into SQL tables.
"""

import os
from pathlib import Path

import duckdb

_project_root = Path.cwd()
while not (_project_root / "api").exists():
    _project_root = _project_root.parent
os.chdir(_project_root)
print(os.getcwd())

# globals
con = duckdb.connect()
proc_dir = Path("Data/_Processed/ambulance")
data_dir = Path("Data/ambulance/ambulance_service_areas.parquet")

# hardcoded specifics:
ambulance_info_cols = [
    "OBJECTID",
    "Serv_Name",
    "Cert_Level",
    "Address",
    "Street_1",
    "Street_2",
    "City",
    "State",
    "Zip_Code",
    "Total_Tran",
    "Per_No_Tran",
    "Re_Per_Tran",
    "Cost_Per",
    "Cost_Call",
]

ambulance_geom_cols = [
    "OBJECTID",
    "Shape__Area",
    "Shape__Length",
    "geometry",
]

# functions:
def load_ambulance_data():
    con.execute("LOAD spatial")

    con.execute(f"""--sql
      CREATE OR REPLACE VIEW ambulance_service_areas AS
      SELECT * FROM read_parquet('{data_dir}')
    """)


def build_ambulance_info_table():
    info_string = ", ".join(ambulance_info_cols)

    con.execute(f"""--sql
      CREATE OR REPLACE VIEW ambulance_info AS
      SELECT {info_string}
      FROM ambulance_service_areas
    """)

def build_ambulance_geom_table():
    geom_string = ", ".join(ambulance_geom_cols)

    con.execute(f"""--sql
      CREATE OR REPLACE VIEW ambulance_geom AS
      SELECT {geom_string}
      FROM ambulance_service_areas
    """)

def build_ambulance_color_table():
    con.execute("""--sql
    CREATE TABLE ambulance_colors (
        certification_level   TEXT PRIMARY KEY,
        hex_color       TEXT NOT NULL,
        rgba            TEXT NOT NULL  -- '[255,127,14,180]' as JSON-ish text
    );

    INSERT INTO ambulance_colors VALUES
        ('Paramedic',         '#2ca02c', '[44, 160, 44, 180]'),
        ('Advanced EMT',   '#ffcc00', '[255, 204, 0, 180]'),
        ('Paramedic - Critical Care Endorsement',   '#fd7e14', '[253, 126, 20, 180]')
    """)

def save_ambulance_tables():
    load_ambulance_data()
    build_ambulance_info_table()
    build_ambulance_geom_table()
    build_ambulance_color_table()

    for table in [
        "ambulance_info",
        "ambulance_geom",
        "ambulance_colors"
    ]:
        con.execute(
            f"COPY (SELECT * FROM {table}) TO '{proc_dir / f'{table}.parquet'}' "
        )

## Putting everything together
def main():
    proc_dir.mkdir(parents=True, exist_ok=True)
    con.execute("LOAD spatial")
    save_ambulance_tables()


if __name__ == "__main__":
    main()