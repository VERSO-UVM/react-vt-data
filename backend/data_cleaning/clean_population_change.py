"""
**Author**:
    Ian Sargent
**Created**:
    2026-09-08
**Description**:
    Data cleaning script for year-over-year percent population change,
    derived from ACS-5 `Population (ACS)` estimates in the raw `demographics`
    DuckLake table.

    Percent change is a first difference between consecutive years for each
    geography:
    (Population_t - Population_t-1) / Population_t-1 * 100

**Run with**:
python -m data_cleaning.clean_population_change
"""

import duckdb
import numpy as np
import pandas as pd


def read_raw_data(con: duckdb.DuckDBPyConnection) -> pd.DataFrame:
    """
    Reads the raw `demographics` table from lake.RAW schema,
    filtered to the total ACS population estimate.
    """
    raw_df = con.execute(
        """--sql
        SELECT
            year,
            NAME,
            geo_type,
            CAST(Value AS DOUBLE) AS Population
        FROM lake.RAW.demographics
        WHERE Variable = 'Population (ACS)'
        """
    ).df()

    return raw_df


def replace_unavailable_data(df: pd.DataFrame) -> pd.DataFrame:
    """
    Converts census-designated missing values
    from -666666666 --> NA (numpy)
    """
    df["Population"] = df["Population"].replace(-666666666.0, np.nan)
    return df


def calculate_pct_change(df: pd.DataFrame) -> pd.DataFrame:
    """
    Computes year-over-year percent population change (first difference)
    for each geography, sorted by year.
    """
    df = df.sort_values(["NAME", "year"])
    df["Pct_Population_Change"] = (
        df.groupby(["NAME", "geo_type"])["Population"].pct_change() * 100
    ).round(1)

    # A geography going from 0 population to nonzero produces an undefined
    # (infinite) percent change; treat it as unavailable.
    df["Pct_Population_Change"] = df["Pct_Population_Change"].replace(
        [np.inf, -np.inf], np.nan
    )

    # Drop each geography's first year (no prior value to diff against)
    return df.dropna(subset=["Pct_Population_Change"])


def clean(con: duckdb.DuckDBPyConnection) -> pd.DataFrame:
    raw_df = read_raw_data(con)
    df = replace_unavailable_data(raw_df)
    df = calculate_pct_change(df)
    return df[["year", "NAME", "Population", "Pct_Population_Change", "geo_type"]]


def add_to_lake(con: duckdb.DuckDBPyConnection, clean_df: pd.DataFrame) -> None:
    """
    Writes the cleaned, long-format percent population change dataframe
    to the CLEANED schema in DuckLake.
    """
    con.execute(
        """--sql
        CREATE OR REPLACE TABLE lake.CLEANED.acs5Demographics_populationChange_timeseries AS
        SELECT * FROM clean_df
        """
    )


def main(con: duckdb.DuckDBPyConnection):
    clean_df = clean(con)
    add_to_lake(con, clean_df)


if __name__ == "__main__":
    main()
