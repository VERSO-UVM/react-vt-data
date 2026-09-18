"""
**Author**:
    Ian Sargent
**Created**:
    2026-07-13
**Description**:
    Data cleaning script for the raw `qcew`
    table in the DuckLake
**Run with**:
python -m data_cleaning.clean_qcew
"""

import duckdb
import pandas as pd

from data_cleaning.geo_lookup import build_geo_lookups


def read_raw_data(con: duckdb.DuckDBPyConnection) -> pd.DataFrame:
    """
    Reads the lake.RAW.qcew table into Python memory using pandas

    Args:
        con: DuckDBPyConnection to the DuckLake

    Returns:
        pd.DataFrame: The pandas DataFrame version of the RAW qcew table
    """
    raw_df = con.execute(
        """--sql
        SELECT * 
        FROM lake.RAW.qcew
        """
    ).df()

    return raw_df


def clean(con: duckdb.DuckDBPyConnection) -> pd.DataFrame:
    raw_df = read_raw_data(con)
    # NOTE: Cleaning already included in data fetch --> returning raw dataframe
    return raw_df


def add_to_lake(con: duckdb.DuckDBPyConnection, clean_df: pd.DataFrame) -> None:
    """
    Writes the cleaned qcew dataframe to the CLEANED schema in DuckLake.

    Args:
        con: DuckDBPyConnection to the DuckLake
        clean_df: The cleaned pandas DataFrame qcew data
    """
    build_geo_lookups(con)
    con.register("clean_df", clean_df)
    con.execute(
        """--sql
        CREATE OR REPLACE TABLE lake.CLEANED.qcew_sectorEmployment_timeseries AS
        SELECT
            c.county_fips AS geoid,
            c.county_fips,
            c.county,
            q.year,
            q.quarter,
            q.quarter_label,
            q.sector,
            q.employment,
            q.employment_4qma
        FROM clean_df AS q
        LEFT JOIN geo_county_lookup AS c
            ON UPPER(TRIM(q."County")) = UPPER(c.county)
        """
    )


def main(con: duckdb.DuckDBPyConnection):
    clean_df = clean(con)
    add_to_lake(con, clean_df)


if __name__ == "__main__":
    main()
