"""
**Author**:
    Atticus Tarleton
**Created**:
    2026-06-28
**Description**:
    Build script to convert the wastewater and soil suitability files into SQL tables.
"""

# TODO: move the large SQL code to its own files rather than inside here

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
proc_dir = Path("Data/_Processed/wastewater")
data_dir = Path("Data")
waste_data_dir = data_dir / "wastewater"
suitability_data_dir = data_dir / "soil-suitability"
sql_path = Path("build/wastewater/sql")

# hardcoded specifics:
## soil suitability table info
suitability_info_cols = ["OGC_FID", "Suitability", "Jurisdiction", "RPC", "Acres"]

suitability_geom_cols = ["OGC_FID", "geom"]

## wastewater service area table info
service_area_info_cols = [
    "ID",
    "TownID",
    "TreatmentFacility",
    "SystemName",
    "SystemOwner",
    "TownName",
    "Municipal_Name",
    "County",
    "RPC",
]

service_miscellaneous_info_cols = [
    "ID",
    "GISNotes",
    "GISDate",
    "GISUpdate",
    "Creator",
    "SourceFile",
    "GEOIDTXT",
]

service_geom_cols = ["ID", "geometry"]

## wastewater treatment facility table info
facility_info_cols = [
    "ID",
    "FacilityID",
    "DesignHydraulicCapacityInMGD",
    "SeptageReceivedAtThisFacility",
    "WWInventoryURL",
    "FacilityName",
    "TownName",
    "Municipal_Name",
    "County",
    "RPC",
]

permit_info_cols = [
    "ID",
    "PermitID",
    "PermitRecordID",
    "NPDESPermitNumber",
    "PermitLink",
    "PermitteeName",
]

facility_miscellaneous_info_cols = ["ID", "SourceFile", "GEOIDTXT"]

facility_geom_cols = ["ID", "Latitude", "Longitude", "geometry"]

# functions:


## soil suitability table creation
def save_suitability_data():
    soil_suit_data_paths = list(suitability_data_dir.glob("*.fgb"))
    con.execute("LOAD spatial")

    build_suitability_color_table()
    con.execute(
        f"COPY (SELECT * FROM soil_suitability_type_colors) TO '{proc_dir / 'soil_suitability' / 'soil_suitability_colors.parquet'}' "
    )

    info_table_names = []
    geom_table_names = []

    for datafile_path in soil_suit_data_paths:
        table_name = datafile_path.stem
        con.execute(f"""--sql
        CREATE OR REPLACE VIEW {table_name} AS
        SELECT * FROM ST_READ('{datafile_path}')
        """)

        info_table_name = build_suitability_info_table(table_name)
        info_table_names.append(info_table_name)
        con.execute(
            f"COPY (SELECT * FROM {info_table_name}) TO '{proc_dir / 'soil_suitability' / f'{info_table_name}.parquet'}' "
        )

        geom_table_name = build_suitability_geom_table(table_name)
        geom_table_names.append(geom_table_name)
        con.execute(
            f"COPY (SELECT * FROM {geom_table_name}) TO '{proc_dir / 'soil_suitability' / f'{geom_table_name}.parquet'}' "
        )

    con.execute(
        f"""CREATE TABLE geom_soil_suit AS SELECT * FROM {geom_table_names[0]};"""
    )
    con.execute(
        f"""CREATE TABLE info_soil_suit AS SELECT * FROM {info_table_names[0]};"""
    )

    for tables in range(len(info_table_names)):
        if tables != 0:
            con.execute(
                f"""INSERT INTO info_soil_suit SELECT * FROM {info_table_names[tables]};"""
            )
            con.execute(
                f"""INSERT INTO geom_soil_suit SELECT * FROM {geom_table_names[tables]};"""
            )

    con.execute("""CREATE SEQUENCE info_id_sequence START 1;""")
    con.execute(
        """ALTER TABLE info_soil_suit ADD COLUMN ID INTEGER DEFAULT nextval('info_id_sequence');"""
    )

    con.execute("""CREATE SEQUENCE geom_id_sequence START 1;""")
    con.execute(
        """ALTER TABLE geom_soil_suit ADD COLUMN ID INTEGER DEFAULT nextval('geom_id_sequence');"""
    )

    con.execute(
        f"COPY (SELECT * FROM info_soil_suit) TO '{proc_dir / 'soil_suitability' / 'info_soil_suit.parquet'}' "
    )
    con.execute(
        f"COPY (SELECT * FROM geom_soil_suit) TO '{proc_dir / 'soil_suitability' / 'geom_soil_suit.parquet'}' "
    )


def build_suitability_info_table(table_name):
    info_string = ", ".join(suitability_info_cols)
    info_table_name = "info_" + table_name

    con.execute(f"""--sql
      CREATE OR REPLACE VIEW {info_table_name} AS
      SELECT {info_string}
      FROM {table_name}
    """)
    return info_table_name


def build_suitability_geom_table(table_name):
    geom_string = ", ".join(suitability_geom_cols)
    geom_table_name = "geom_" + table_name

    con.execute(f"""--sql
      CREATE OR REPLACE VIEW {geom_table_name} AS
      SELECT {geom_string}
      FROM {table_name}
    """)
    return geom_table_name


def build_suitability_color_table():
    con.execute("""--sql
    CREATE TABLE soil_suitability_type_colors (
        soil_suitability   TEXT PRIMARY KEY,
        hex_color       TEXT NOT NULL,
        rgba            TEXT NOT NULL  -- '[255,127,14,180]' as JSON-ish text
    );

    INSERT INTO soil_suitability_type_colors VALUES
        ('Well Suited',         '#2ca02c', '[44, 160, 44, 180]'),
        ('Moderately Suited',   '#ffcc00', '[255, 204, 0, 180]'),
        ('Marginally Suited',   '#fd7e14', '[253, 126, 20, 180]'),
        ('Not Suited',          '#dc3545', '[220, 53, 69, 180]'),
        ('Not Rated',           '#6c757d', '[108, 117, 125, 180]');
    """)


## wastewater service area table creation
def load_wastewater_service_data():
    waste_service_path = waste_data_dir / "ww_service_areas_new.parquet"
    con.execute("LOAD spatial")

    con.execute(f"""--sql
      CREATE OR REPLACE VIEW wastewater_service_areas AS
      SELECT * FROM read_parquet('{waste_service_path}')
    """)


def build_wastewater_service_info_table():
    service_area_info_string = ", ".join(service_area_info_cols)

    con.execute(f"""--sql
      CREATE OR REPLACE VIEW service_area_info AS
      SELECT {service_area_info_string}
      FROM wastewater_service_areas
    """)


def build_wastewater_service_geom_table():
    service_miscellaneous_info_string = ", ".join(service_miscellaneous_info_cols)

    con.execute(f"""--sql
      CREATE OR REPLACE VIEW service_area_miscellaneous_info AS
      SELECT {service_miscellaneous_info_string}
      FROM wastewater_service_areas
    """)


def build_wastewater_service_miscellaneous_info_table():
    service_geom_string = ", ".join(service_geom_cols)

    con.execute(f"""--sql
      CREATE OR REPLACE VIEW service_area_geom AS
      SELECT {service_geom_string}
      FROM wastewater_service_areas
    """)


def save_wastewater_service_area_tables():
    load_wastewater_service_data()
    build_wastewater_service_info_table()
    build_wastewater_service_geom_table()
    build_wastewater_service_miscellaneous_info_table()

    for table in [
        "service_area_info",
        "service_area_miscellaneous_info",
        "service_area_geom",
    ]:
        con.execute(
            f"COPY (SELECT * FROM {table}) TO '{proc_dir / 'service_areas' / f'{table}.parquet'}' "
        )


## wastewater treatment facility table creation
def load_wastewater_facility_data():
    waste_facility_path = waste_data_dir / "ww_treatment_facilities_new.parquet"

    con.execute(f"""--sql
      CREATE OR REPLACE VIEW wastewater_treatment_facilities AS
      SELECT * FROM read_parquet('{waste_facility_path}')
    """)


def build_wastewater_facility_info_table():
    facility_info_string = ", ".join(facility_info_cols)

    con.execute(f"""--sql
      CREATE OR REPLACE VIEW treatment_facility_info AS
      SELECT {facility_info_string}
      FROM wastewater_treatment_facilities
    """)


def build_wastewater_facility_geom_table():
    facility_geom_string = ", ".join(facility_geom_cols)

    con.execute(f"""--sql
      CREATE OR REPLACE VIEW treatment_facility_geom AS
      SELECT {facility_geom_string}
      FROM wastewater_treatment_facilities
    """)


def build_wastewater_facility_miscellaneous_info_table():
    facility_miscellaneous_info_string = ", ".join(facility_miscellaneous_info_cols)

    con.execute(f"""--sql
      CREATE OR REPLACE VIEW treatment_facility_miscellaneous_info AS
      SELECT {facility_miscellaneous_info_string}
      FROM wastewater_treatment_facilities
    """)


def build_wastewater_permit_table():
    facility_permit_info_string = ", ".join(permit_info_cols)

    con.execute(f"""--sql
      CREATE OR REPLACE VIEW treatment_facility_permit_info AS
      SELECT {facility_permit_info_string}
      FROM wastewater_treatment_facilities
    """)


def save_wastewater_facility_tables():
    load_wastewater_facility_data()
    build_wastewater_facility_info_table()
    build_wastewater_facility_geom_table()
    build_wastewater_facility_miscellaneous_info_table()
    build_wastewater_permit_table()

    for table in [
        "treatment_facility_info",
        "treatment_facility_geom",
        "treatment_facility_miscellaneous_info",
        "treatment_facility_permit_info",
    ]:
        con.execute(
            f"COPY (SELECT * FROM {table}) TO '{proc_dir / 'treatment_facilities' / f'{table}.parquet'}' "
        )


## Putting everything together
def main():
    proc_dir.mkdir(parents=True, exist_ok=True)
    con.execute("LOAD spatial")

    save_wastewater_facility_tables()
    save_wastewater_service_area_tables()
    save_suitability_data()


if __name__ == "__main__":
    main()
