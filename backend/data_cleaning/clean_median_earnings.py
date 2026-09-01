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

from datetime import datetime

import duckdb
import numpy as np
import pandas as pd

INFLATION_YEAR = datetime.now().year - 2


def read_raw_data(con: duckdb.DuckDBPyConnection) -> pd.DataFrame:
    raw_df = con.execute(
        f"""--sql
        SELECT year, NAME, Subcategory AS 'Variable', Value, geo_type
        FROM lake.RAW.acs5_economic
        WHERE Category LIKE '%INCOME AND BENEFITS ' || chr(40) || 'IN {INFLATION_YEAR}%'
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


def change_dtype(df: pd.DataFrame) -> pd.DataFrame:
    df["Value"] = pd.to_numeric(df["Value"], errors="coerce")
    return df


def replace_unavailable_data(df: pd.DataFrame) -> pd.DataFrame:
    df["Value"] = df["Value"].replace(-666666666.0, np.nan)
    return df


def clean(con: duckdb.DuckDBPyConnection) -> pd.DataFrame:
    raw_df = read_raw_data(con)
    df = change_dtype(raw_df)
    df = replace_unavailable_data(df)

    return df


def add_to_lake(con: duckdb.DuckDBPyConnection, clean_df: pd.DataFrame) -> None:
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


def main(con: duckdb.DuckDBPyConnection):
    clean_df = clean(con)
    add_to_lake(con, clean_df)


if __name__ == "__main__":
    main()
