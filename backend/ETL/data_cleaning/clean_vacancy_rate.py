"""
**Author**:
    Ian Sargent
**Created**:
    2026-07-14
**Description**:
    Data cleaning script for vacancy rate.
    Derived from the `RAW.housing` DuckLake table
    Run with
python -m ETL.data_cleaning.clean_vacancy_rate
"""

import numpy as np
import pandas as pd

from datastore.lake_build import con


def read_raw_data() -> pd.DataFrame:
    raw_df = con.execute(
        """
        SELECT year, NAME, Variable, Percent, geo_type,
        FROM lake.RAW.housing
        WHERE Variable IN ('Homeowner Vacancy Rate', 'Rental Vacancy Rate')
        ORDER BY year;
        """
    ).df()

    return raw_df


def rename_county_subdivision(df: pd.DataFrame):
    df["geo_type"] = df["geo_type"].replace("county_subdivision", "town")

    return df


def change_dtype(df: pd.DataFrame):
    df["Percent"] = pd.to_numeric(df["Percent"], errors="coerce")

    return df


def replace_unavailable_data(df: pd.DataFrame):
    df["Percent"] = df["Percent"].replace(-666666666.0, np.nan)

    return df


def clean():
    raw_df = read_raw_data()
    df = rename_county_subdivision(raw_df)
    df = change_dtype(df)
    df = replace_unavailable_data(df)

    return df


def add_to_lake(clean_df: pd.DataFrame):
    """
    Writes the cleaned, long-format vacancy_rate dataframe
    to the CLEANED schema in DuckLake.
    """
    con.execute(
        """
        CREATE OR REPLACE TABLE lake.CLEANED.vacancy_rate AS
        SELECT * FROM clean_df
        """
    )


def main():
    clean_df = clean()
    add_to_lake(clean_df)


if __name__ == "__main__":
    main()
