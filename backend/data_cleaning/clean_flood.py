"""
**Author**:
    Ian Sargent
**Created**:
    2026-07-16
**Description**:
    Data cleaning script for the raw `flood` table in the DuckLake
    Run with:
python -m ETL.data_cleaning.clean_flood
"""

from datastore.lake_build import con


## LOAD SPATIAL EXTENSION FUNCTION --------------------
def _load_spatial() -> None:
    """
    Load the spatial extension, installing it first if necessary.
    """
    try:
        con.execute("""--sql LOAD spatial""")
    except Exception:
        con.execute("""--sql INSTALL spatial""")
        con.execute("""--sql LOAD spatial""")


def build_flood():
    """
    Clean FEMA flood polygons.
    """
    con.execute(
        """--sql
        CREATE OR REPLACE VIEW flood AS
        SELECT
            ST_GeomFromWKB(geometry) AS geometry,
            FLD_ZONE,
            COALESCE(ZONE_SUBTY, 'None') AS ZONE_SUBTY_DISPLAY,
            CASE
                WHEN STATIC_BFE = -9999 THEN 'N/A'
                ELSE CAST(STATIC_BFE AS VARCHAR)
            END AS STATIC_BFE_DISPLAY,
            CASE FLD_ZONE
                WHEN 'A'  THEN [255,140,0,195]
                WHEN 'AE' THEN [230,60,0,205]
                WHEN 'AH' THEN [200,20,0,195]
                WHEN 'AO' THEN [255,110,0,195]
                ELSE [220,50,0,185]
            END AS rgba_color
        FROM lake.RAW.flood
        WHERE SFHA_TF = 'T'
        """
    )


def add_to_lake():
    con.execute(
        """--sql
        CREATE OR REPLACE TABLE lake.CLEANED.FEMA_floodHazard_geom AS
        SELECT *
        FROM flood
        """
    )


def clean():
    _load_spatial()
    build_flood()


def main():
    clean()
    add_to_lake()


if __name__ == "__main__":
    main()
