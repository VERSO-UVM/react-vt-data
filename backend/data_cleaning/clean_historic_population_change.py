"""
**Author**:
    Ian Sargent
**Created**:
    2026-09-08
**Description**:
    Data cleaning script for decade-over-decade percent population change,
    derived from the long-format historic (decennial) population timeseries
    produced by `clean_historic_population.py`.

    Percent change is a first difference between consecutive census years
    for each geography:
    (Population_t - Population_t-1) / Population_t-1 * 100

**Run with**:
python -m data_cleaning.clean_historic_population_change
"""

import duckdb
import numpy as np
import pandas as pd

from data_cleaning.clean_historic_population import clean as clean_historic_population


def calculate_pct_change(df: pd.DataFrame) -> pd.DataFrame:
    """
    Computes decade-over-decade percent population change (first difference)
    for each geography, sorted by year.
    """
    df = df.sort_values(["geoid", "year"])
    df["Pct_Population_Change"] = (
        df.groupby("geoid")["Population"].pct_change() * 100
    ).round(1)

    # A town going from 0 population to nonzero (e.g. newly incorporated)
    # produces an undefined (infinite) percent change; treat it as unavailable.
    df["Pct_Population_Change"] = df["Pct_Population_Change"].replace(
        [np.inf, -np.inf], np.nan
    )

    # Drop each geography's first census year (no prior value to diff against)
    return df.dropna(subset=["Pct_Population_Change"])


def clean(con: duckdb.DuckDBPyConnection) -> pd.DataFrame:
    long_df = clean_historic_population(con)
    df = calculate_pct_change(long_df)
    column_order = [
        "geoid",
        "NAME",
        "year",
        "Population",
        "Pct_Population_Change",
        "geo_type",
    ]

    return df[column_order]


def add_to_lake(con: duckdb.DuckDBPyConnection, clean_df: pd.DataFrame) -> None:
    """
    Writes the cleaned, long-format percent population change dataframe
    to the CLEANED schema in DuckLake.
    """
    con.execute(
        """--sql
        CREATE OR REPLACE TABLE lake.CLEANED.VCGI_historicPopulation_pctChange_timeseries AS
        SELECT * FROM clean_df
        """
    )


def main(con: duckdb.DuckDBPyConnection):
    clean_df = clean(con)
    add_to_lake(con, clean_df)


if __name__ == "__main__":
    main()
