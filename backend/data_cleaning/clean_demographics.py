"""
**Author**:
    Ian Sargent
**Created**:
    2026-07-13
**Description**:
    Data cleaning script for the raw (curated variables) `demographics`
    table in the DuckLake
**Run with**:
python -m data_cleaning.clean_demographics`
"""

import duckdb
import pandas as pd


def read_raw_data(con: duckdb.DuckDBPyConnection) -> pd.DataFrame:
    raw_df = con.execute(
        """--sql
        SELECT * 
        FROM lake.RAW.demographics
        """
    ).df()

    return raw_df


def clean(con: duckdb.DuckDBPyConnection):
    raw_df = read_raw_data(con)
    # NOTE: Cleaning already included in data fetch --> returning raw dataframe
    return raw_df


def add_to_lake(clean_df: pd.DataFrame, con: duckdb.DuckDBPyConnection):
    """
    Writes the cleaned demographics dataframe
    to the CLEANED schema in DuckLake.
    """
    con.execute(
        """--sql
        CREATE OR REPLACE TABLE lake.CLEANED.acs5_demographics_tidy AS
        SELECT * FROM clean_df
        """
    )


def main(con: duckdb.DuckDBPyConnection):
    clean_df = clean(con)
    add_to_lake(clean_df, con)


if __name__ == "__main__":
    main()
