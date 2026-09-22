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

    Args:
        con: DuckDBPyConnection to the DuckLake
    """
    con.execute(
        """--sql
        CREATE OR REPLACE VIEW flood AS
        SELECT
            ST_GeomFromWKB(geometry) AS geometry,
            FLD_ZONE AS flood_zone_type,
            COALESCE(ZONE_SUBTY, 'None') AS zone_subtype,
            CASE -- Base flood elevation
                WHEN STATIC_BFE = -9999 THEN NULL
                ELSE CAST(STATIC_BFE AS VARCHAR)
            END AS base_flood_elevation,
            CASE FLD_ZONE -- Flood zone color column (rgb)
                WHEN 'A'  THEN [255,140,0,195]
                WHEN 'AE' THEN [230,60,0,205]
                WHEN 'AH' THEN [200,20,0,195]
                WHEN 'AO' THEN [255,110,0,195]
                WHEN 'X' THEN [255,195,0,195]
                WHEN 'D' THEN [70,50,255,195]
                WHEN 'OPEN WATER' THEN [70,50,255,195]
                ELSE [220,220,220,195]
            END AS rgba_color,
            CASE -- 'Flood risk' column (in english)
                WHEN FLD_ZONE IN ('A', 'AE', 'AH', 'AO') THEN 'High'
                WHEN FLD_ZONE = 'X' AND ZONE_SUBTY LIKE '%0.2 PCT%' THEN 'Moderate'
                WHEN FLD_ZONE = 'X' THEN 'Minimal'
                WHEN FLD_ZONE = 'D' THEN 'Undetermined'
                ELSE NULL
            END AS flood_risk,
            CAST(SFHA_TF AS BOOLEAN) AS special_flood_hazard_zone
        FROM lake.RAW.flood
        """
    )


def add_to_lake(con: duckdb.DuckDBPyConnection) -> None:
    """
    Write cleaned FEMA flood data to the lake.CLEANED schema table using the `flood` view

    Args:
        con: DuckDBPyConnection to the DuckLake
    """
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
