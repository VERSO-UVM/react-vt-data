"""
**Author**:
    Ian Sargent
**Created**:
    2026-08-25
**Description**:
    Data cleaning script for median earnings (Male, Female, All Workers).
    Derived from the `RAW.acs5_economic` DuckLake table
**Run with**:
python -m data_cleaning.clean_median_earnings
"""

import numpy as np
import pandas as pd

from lake_build import con


def read_raw_data() -> pd.DataFrame:
    raw_df = con.execute(
        """--sql
        SELECT year, NAME, Subcategory AS 'Variable', Value, geo_type
        FROM lake.RAW.acs5_economic
        WHERE Category LIKE '%INCOME AND BENEFITS ' || chr(40) || 'IN 2024%'
        AND Subcategory IN (
            'Median earnings for male full-time, year-round workers (dollars)',
            'Median earnings for female full-time, year-round workers (dollars)',
            'Median earnings for workers (dollars)'
        )
        AND Variable = 'Total'
        AND Measure = 'Estimate'
        ORDER BY year;
        """
    ).df()

    return raw_df


def change_dtype(df: pd.DataFrame):
    df["Value"] = pd.to_numeric(df["Value"], errors="coerce")

    return df


def replace_unavailable_data(df: pd.DataFrame):
    df["Value"] = df["Value"].replace(-666666666.0, np.nan)

    return df


def clean():
    raw_df = read_raw_data()
    df = change_dtype(raw_df)
    df = replace_unavailable_data(df)

    return df


def add_to_lake(clean_df: pd.DataFrame):
    """
    Writes the cleaned, long-format health_insurance_coverage dataframe
    to the CLEANED schema in DuckLake.
    """
    con.execute(
        """--sql
        CREATE OR REPLACE TABLE lake.CLEANED.acs5Economics_medianEarnings_timeseries AS
        SELECT * FROM clean_df
        """
    )


def main():
    clean_df = clean()
    add_to_lake(clean_df)


if __name__ == "__main__":
    main()
