"""
**Author**:
    Ian Sargent
**Created**:
    2026-08-28
**Description**:
    Data cleaning script for the raw `building_footprints` table in the DuckLake.
**Run with**:
    python -m data_cleaning.clean_building_footprints
"""

import duckdb
import pandas as pd


def build_town_geoid(con: duckdb.DuckDBPyConnection) -> None:
    """
    Building the `town_geoid` table by joining in town geoids from the
    RAW.vt_town_lines table

    Args:
        con: DuckDBPyConnection to the DuckLake
    """
    con.execute(
        r"""--sql
        CREATE OR REPLACE TEMP VIEW town_geoid AS
        WITH parsed AS (
            SELECT DISTINCT
                GEOID,
                NAME,
                regexp_extract(NAME, '^(.*?)\s+(town|city|gore|grant),', 1) AS base,
                regexp_extract(NAME, '^(.*?)\s+(town|city|gore|grant),', 2) AS suffix
            FROM lake.RAW.vt_town_lines
        ),
        counted AS (
            SELECT *, COUNT(*) OVER (PARTITION BY base) AS base_count
            FROM parsed
        ),
        candidates AS (
            SELECT
                GEOID,
                TRIM(SPLIT_PART(NAME, ',', 1)) AS town,
                TRIM(REPLACE(SPLIT_PART(NAME, ',', 2), ' County', '')) AS county,
                REPLACE(UPPER(base || ' ' || suffix), chr(39), '') AS town_key
            FROM counted
            UNION
            -- Bare variant, only when it's unambiguous (unique base name)
            -- and the suffix isn't part of the proper name.
            SELECT
                GEOID,
                TRIM(SPLIT_PART(NAME, ',', 1)) AS town,
                TRIM(REPLACE(SPLIT_PART(NAME, ',', 2), ' County', '')) AS county,
                REPLACE(UPPER(base), chr(39), '') AS town_key
            FROM counted
            WHERE base_count = 1 AND suffix NOT IN ('gore', 'grant')
        )
        SELECT GEOID, town, county, town_key AS TOWN_KEY FROM candidates
        """
    )


def build_footprints(con: duckdb.DuckDBPyConnection) -> pd.DataFrame:
    """
    Clean building footprint polygons.

    Args:
        con: DuckDBPyConnection to the DuckLake
    """
    build_town_geoid(con)

    df = con.execute(
        """--sql
        SELECT
            bf.OBJECTID AS object_id,
            tg.town,
            tg.county,
            tg.GEOID AS geoid,
            bf.HEIGHTFT AS height_ft,
            bf.SITETYPE AS building_type,
            bf.POLY_TYPE AS print_type,
            ST_GeomFromWKB(bf.geometry) AS geometry
        FROM lake.RAW.building_footprints bf
        LEFT JOIN town_geoid tg
            ON REPLACE(UPPER(TRIM(bf.E911TOWN)), chr(39), '') = tg.TOWN_KEY
        """
    ).df()

    df["name"] = df["town"] + ", " + df["county"] + " County, Vermont"

    cols = [
        "object_id",
        "town",
        "county",
        "geoid",
        "name",
        "height_ft",
        "building_type",
        "print_type",
        "geometry",
    ]
    return df[cols]


def add_to_lake(con: duckdb.DuckDBPyConnection, df: pd.DataFrame) -> None:
    """
    Add the building footprints table to the lake.CLEANED schema table.

    Args:
        con: DuckDBPyConnection to the DuckLake
        df: pandas.DataFrame object in which to write to the CLEANED table
    """
    con.register("tmp_df", df)
    try:
        con.execute(
            """--sql
            CREATE OR REPLACE TABLE lake.CLEANED.VCGI_buildingFootprints_geom AS
            SELECT * FROM tmp_df
            """
        )
    finally:
        con.unregister("tmp_df")


def clean(con: duckdb.DuckDBPyConnection) -> pd.DataFrame:
    return build_footprints(con)


def main(con: duckdb.DuckDBPyConnection) -> None:
    df = clean(con)
    add_to_lake(con, df)


if __name__ == "__main__":
    main()
