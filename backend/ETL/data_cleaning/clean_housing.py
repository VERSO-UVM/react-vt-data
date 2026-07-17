"""
**Author**:
    Ian Sargent
**Created**:
    2026-07-13
**Description**:
    Data cleaning script for the raw (curated variables) `housing` table in the DuckLake
    Run with:
python -m ETL.data_cleaning.clean_housing
"""

import pandas as pd

from datastore.lake_build import con


def read_raw_data() -> pd.DataFrame:
    raw_df = con.execute(
        """
        SELECT * 
        FROM lake.RAW.housing
        """
    ).df()

    return raw_df


def clean():
    raw_df = read_raw_data()
    # NOTE: Cleaning already included in data fetch --> returning raw dataframe
    return raw_df


def add_to_lake(clean_df: pd.DataFrame):
    """
    Writes the cleaned housing dataframe
    to the CLEANED schema in DuckLake.
    """
    con.execute(
        """
        CREATE OR REPLACE TABLE lake.CLEANED.acs5_housing_tidy AS
        SELECT * FROM clean_df
        """
    )


def main():
    clean_df = clean()
    add_to_lake(clean_df)


if __name__ == "__main__":
    main()
