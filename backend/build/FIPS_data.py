"""
**Author**:
    Fitz Koch
**Created**:
    2026-06-23
**Description**:
    Build processed and clean boundary (county, tract, town)
      line tables to join on.

    CRS: every boundary table is normalised to EPSG:4326 (WGS84), which is what
    the zoning geometry uses, what deck.gl/MapLibre expect, and what GeoJSON
    requires (RFC 7946). The Census sources ship as EPSG:4269 (NAD83), whose
    coordinates are also lon/lat degrees, so the transform is a small datum
    shift rather than a reprojection -- but it must still be declared, and
    `always_xy` must be set because EPSG:4269 is registered lat/lon.
"""

from build import BACKEND, CON, data_dir

proc_dir = BACKEND / "Data" / "_Processed" / "vermont"
sql_path = BACKEND / "build" / "sql"

NAD83 = "EPSG:4269"
WGS84 = "EPSG:4326"


def build_counties():
    """County lines. Source GeoJSON is already WGS84."""
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
    """Census tracts. The TIGER shapefile is NAD83, so transform to WGS84."""
    path = data_dir / "vermont" / "cb_2025_50_tract_500k" / "cb_2025_50_tract_500k.shp"
    CON.execute(f"""--sql
        CREATE OR REPLACE VIEW tracts AS
        SELECT
            GEOID AS LocationID,
            NAMELSAD AS name,
            ST_Transform(geom, '{NAD83}', '{WGS84}', true) AS geometry
        FROM ST_Read('{path}')
        """)


def build_towns():
    """Town (county subdivision) boundaries, NAD83 -> WGS84.

    FIPS_ID is the 10-digit county-subdivision GEOID, which is what the zoning
    data carries as GEO_ID -- that join is how we work out which parts of a town
    have no zoning district (see build/zoning.py).

    The source NAME is fully qualified ("Windsor town, Windsor County,
    Vermont"); keep just the town portion, since that is what gets shown to
    users in map tooltips.
    """
    path = data_dir / "vermont" / "municipalities.json"
    CON.execute(f"""--sql
        CREATE OR REPLACE VIEW towns AS
        SELECT
            GEOID AS FIPS_ID,
            TRIM(SPLIT_PART("NAME", ',', 1)) AS TOWN_NAME,
            ST_Transform(geom, '{NAD83}', '{WGS84}', true) AS geometry
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
