"""
**Description**:
    Data cleaning script for the raw `gazetteer` table in the DuckLake.
    Turns ~3,200 US counties into lake.CLEANED.land_area: land area in square
    miles for the 14 Vermont counties, Vermont, and the United States, keyed
    to match acs5_dp_combined_tidy (geo_type + geoid) for population density.
**Run with**:
python -m data_cleaning.clean_gazetteer
"""

import duckdb
import pandas as pd


def read_raw_data(con: duckdb.DuckDBPyConnection) -> pd.DataFrame:
    """
    Reads the lake.RAW.gazetteer table into Python memory using pandas

    Args:
        con: DuckDBPyConnection to the DuckLake

    Returns:
        pd.DataFrame: The pandas DataFrame version of the RAW gazetteer table
    """
    raw_df = con.execute(
        """--sql
        SELECT *
        FROM lake.RAW.gazetteer
        """
    ).df()

    return raw_df


def build_land_area(raw_df: pd.DataFrame) -> pd.DataFrame:
    """
    Builds the 16 land-area rows from the raw Gazetteer counties.
    Pure pandas (no lake), so it can be tested on fetch_gazetteer() output.

    Args:
        raw_df: One row per US county, with USPS, GEOID and ALAND_SQMI

    Returns:
        pd.DataFrame: geoid | geo_type | land_sqmi, one row per VT county
        plus Vermont ("50", "state") and the US (None, "national")
    """
    # 1. The 14 Vermont counties; GEOID is already "50009"-style text
    vt = raw_df[raw_df["USPS"] == "VT"]
    counties = pd.DataFrame(
        {
            "geoid": vt["GEOID"],
            "geo_type": "county",
            "land_sqmi": vt["ALAND_SQMI"],
        }
    )

    # 2. Vermont total. The warehouse's state geoid is "50"
    state = pd.DataFrame(
        {"geoid": ["50"], "geo_type": ["state"], "land_sqmi": [vt["ALAND_SQMI"].sum()]}
    )

    # 3. US total. ACS "United States" (us:1) excludes Puerto Rico, so we do too.
    # The warehouse's national geoid is NULL; joins use IS NOT DISTINCT FROM.
    us_counties = raw_df[raw_df["USPS"] != "PR"]
    national = pd.DataFrame(
        {
            "geoid": [None],
            "geo_type": ["national"],
            "land_sqmi": [us_counties["ALAND_SQMI"].sum()],
        }
    )

    return pd.concat([counties, state, national], ignore_index=True)


def clean(con: duckdb.DuckDBPyConnection) -> pd.DataFrame:
    raw_df = read_raw_data(con)
    return build_land_area(raw_df)


def add_to_lake(con: duckdb.DuckDBPyConnection, clean_df: pd.DataFrame) -> None:
    """
    Writes the land-area rows to the CLEANED schema in DuckLake.

    Args:
        con: DuckDBPyConnection to the DuckLake
        clean_df: The 16 rows from build_land_area
    """
    con.register("clean_df", clean_df)
    con.execute(
        """--sql
        CREATE OR REPLACE TABLE lake.CLEANED.land_area AS
        SELECT
            CAST(geoid AS VARCHAR) AS geoid,
            CAST(geo_type AS VARCHAR) AS geo_type,
            CAST(land_sqmi AS DOUBLE) AS land_sqmi
        FROM clean_df
        """
    )


def main(con: duckdb.DuckDBPyConnection):
    clean_df = clean(con)
    add_to_lake(con, clean_df)


if __name__ == "__main__":
    main()
