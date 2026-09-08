"""
**Author**:
    Ian Sargent
**Created**:
    2026-07-16
**Description**:
    Data cleaning script for the raw `flood` table in the DuckLake
    Run with:
python -m data_cleaning.clean_flood
"""

import duckdb


def build_flood(con: duckdb.DuckDBPyConnection) -> None:
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


def add_to_lake(con: duckdb.DuckDBPyConnection) -> None:
    con.execute(
        """--sql
        CREATE OR REPLACE TABLE lake.CLEANED.FEMA_floodHazard_geom AS
        SELECT *
        FROM flood
        """
    )


def clean(con: duckdb.DuckDBPyConnection) -> None:
    build_flood(con)


def main(con: duckdb.DuckDBPyConnection):
    clean(con)
    add_to_lake(con)


if __name__ == "__main__":
    main()
