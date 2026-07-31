"""
**Author**:
    Fitz Koch
**Created**:
    2026-06-23
**Description**:
    Build processed and clean boundary (county, tract)
      line tables to join on.
"""

from build import BACKEND, CON, data_dir

proc_dir = BACKEND / "Data" / "_Processed" / "vermont"
sql_path = BACKEND / "build" / "sql"


def build_counties():
    path = data_dir / "vermont" / "countyLines.geojson"
    CON.execute(f"""--sql
        CREATE OR REPLACE VIEW counties AS
        SELECT
            CNTYGEOID AS CountyFIPS,
            CNTYNAME AS CountyName,
            geom
        FROM ST_Read('{path}')
    """)


def build_tracts():
    path = data_dir / "vermont" / "cb_2025_50_tract_500k" / "cb_2025_50_tract_500k.shp"
    CON.execute(f"""--sql
        CREATE OR REPLACE VIEW tracts AS
        SELECT
            GEOID AS LocationID,
            NAMELSAD AS name,
            geom AS geometry
        FROM ST_Read('{path}')
        """)


def build_towns():
    path = data_dir / "vermont" / "municipalities.json"
    CON.execute(f"""--sql
        CREATE OR REPLACE VIEW towns AS
        SELECT
            GEOID AS FIPS_ID,
            "NAME" as TOWN_NAME,
            ST_Transform(geom, 'EPSG:4269', 'EPSG:4326', true) AS geometry
        FROM ST_Read('{path}')
    """)


def main():
    build_counties()
    build_tracts()
    build_towns()
    proc_dir.mkdir(parents=True, exist_ok=True)
    for table in ["counties", "tracts", "towns"]:
        CON.execute(
            f"COPY (SELECT * FROM {table}) TO '{proc_dir / f'{table}.parquet'}' "
        )


if __name__ == "__main__":
    main()
