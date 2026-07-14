"""
**Author**:
    Ian Sargent
**Created**:
    2026-07-14
**Description**:
    Data cleaning script for total housing units.
    Derived from the `RAW.housing` DuckLake table
    Run with
python -m ETL.data_cleaning.clean_total_housing_units
"""

import numpy as np
import pandas as pd

from datastore.lake_build import con


def read_raw_data() -> pd.DataFrame:
    raw_df = con.execute(
        """
        SELECT year, NAME, Value AS Total_Housing_Units, geo_type,
        FROM lake.RAW.housing
        WHERE Variable = 'Total Housing Units'
        ORDER BY year;
        """
    ).df()

    return raw_df


def rename_county_subdivision(df: pd.DataFrame):
    df["geo_type"] = df["geo_type"].replace("county_subdivision", "town")

    return df


def change_age_dtype(df: pd.DataFrame):
    df["Total_Housing_Units"] = pd.to_numeric(df["Total_Housing_Units"], errors="coerce")

    return df


def replace_unavailable_data(df: pd.DataFrame):
    df["Total_Housing_Units"] = df["Total_Housing_Units"].replace(-666666666.0, np.nan)

    return df


def clean():
    raw_df = read_raw_data()
    df = rename_county_subdivision(raw_df)
    df = change_age_dtype(df)
    df = replace_unavailable_data(df)

    return df


def add_to_lake(clean_df: pd.DataFrame):
    """
    Writes the cleaned, long-format median_age dataframe
    to the CLEANED schema in DuckLake.
    """
    con.execute(
        """
        CREATE OR REPLACE TABLE lake.CLEANED.median_age AS
        SELECT * FROM clean_df
        """
    )


def main():
    clean_df = clean()
    add_to_lake(clean_df)


if __name__ == "__main__":
    main()
