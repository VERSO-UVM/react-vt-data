"""
**Author**:
    Ian Sargent
**Created**:
    2026-07-14
**Description**:
    Data cleaning script for historic unemployment rate.
    Derived from the `RAW.acs5_economic` DuckLake table
    Run with
python -m ETL.data_cleaning.clean_unemployment_rate
"""

import numpy as np
import pandas as pd

from datastore.lake_build import con


def read_raw_data() -> pd.DataFrame:
    raw_df = con.execute(
        """
        SELECT year, NAME, Value as Unemployment_Rate, geo_type
        FROM lake.RAW.acs5_economic
        WHERE Variable = 'Unemployment Rate' 
        AND Measure = 'Percent'
        ORDER BY year DESC;
        """
    ).df()

    return raw_df


def rename_county_subdivision(df: pd.DataFrame):
    df["geo_type"] = df["geo_type"].replace("county_subdivision", "town")

    return df


def change_dtype(df: pd.DataFrame):
    df["Unemployment_Rate"] = pd.to_numeric(df["Unemployment_Rate"], errors="coerce")

    return df


def replace_unavailable_data(df: pd.DataFrame):
    df["Unemployment_Rate"] = df["Unemployment_Rate"].replace(-666666666.0, np.nan)

    return df


def clean():
    raw_df = read_raw_data()
    df = rename_county_subdivision(raw_df)
    df = change_dtype(df)
    df = replace_unavailable_data(df)

    return df


def add_to_lake(clean_df: pd.DataFrame):
    """
    Writes the cleaned, long-format unemployment_rate dataframe
    to the CLEANED schema in DuckLake.
    """
    con.execute(
        """
        CREATE OR REPLACE TABLE lake.CLEANED.unemployment_rate AS
        SELECT * FROM clean_df
        """
    )


def main():
    clean_df = clean()
    add_to_lake(clean_df)


if __name__ == "__main__":
    main()
