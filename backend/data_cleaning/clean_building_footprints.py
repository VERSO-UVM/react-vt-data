"""
**Author**:
    Ian Sargent
**Created**:
    2026-08-28
**Description**:
    Data cleaning script for the raw `building_footprints` table in the DuckLake
    Run with:
python -m ETL.data_cleaning.clean_building_footprints
"""

from datastore.lake_build import con


## LOAD SPATIAL EXTENSION FUNCTION --------------------
def _load_spatial() -> None:
    """
    Load the spatial extension, installing it first if necessary.
    """
    try:
        con.execute("""LOAD spatial""")
    except Exception:
        con.execute("""INSTALL spatial""")
        con.execute("""LOAD spatial""")


def build_footprints():
    """
    Clean FEMA flood polygons.
    """
    con.execute(
        """--sql
        CREATE OR REPLACE VIEW footprints AS
        SELECT
            POLY_ID,
            E911TOWN,
            TOWNGEOID,
            COUNTY,
            HEIGHTFT,
            SITETYPE,
            POLYTYPE,
            ST_GeomFromWKB(geometry) AS geometry,
        
        FROM lake.RAW.building_footprints
        """
    )


def add_to_lake():
    con.execute(
        """--sql
        CREATE OR REPLACE TABLE lake.CLEANED.VCGI_buildingFootprints_geom AS
        SELECT *
        FROM footprints
        """
    )


def clean():
    _load_spatial()
    build_footprints()


def main():
    clean()
    add_to_lake()


if __name__ == "__main__":
    main()
