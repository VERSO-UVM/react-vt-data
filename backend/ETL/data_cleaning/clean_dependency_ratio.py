"""
**Author**:
    Ian Sargent
**Created**:
    2026-07-14
**Description**:
    Data cleaning script for historic dependency ratio.
    Variable derived from the `RAW.demographics` DuckLake table, defined as:

    (Under 18 + 65 and Over) / (Ages 18-64)

    Run with:
python -m ETL.data_cleaning.clean_dependency_ratio
"""

import numpy as np
import pandas as pd

from datastore.lake_build import con


def read_raw_data() -> pd.DataFrame:
    raw_df = con.execute(
        """--sql
        SELECT
            year,
            NAME,
            geo_type,
            Variable,
            CAST(Value AS DOUBLE) AS Value
        FROM lake.RAW.demographics
        WHERE Variable IN (
            'Under 18',
            '18 to 24',
            '25 to 34',
            '35 to 44',
            '45 to 54',
            '55 to 64',
            '65 to 74',
            '75 Plus'          
        )
        """).df()

    return raw_df


def replace_unavailable_data(df: pd.DataFrame):
    df["Value"] = df["Value"].replace(-666666666.0, np.nan)

    return df


def calculate_dependency_ratio(df: pd.DataFrame):
    df = df.pivot_table(
        index=["year", "NAME", "geo_type"],
        columns="Variable",
        values="Value",
        aggfunc="first",
    ).reset_index()

    working_age = (
        df["18 to 24"]
        + df["25 to 34"]
        + df["35 to 44"]
        + df["45 to 54"]
        + df["55 to 64"]
    )
    
    df["Age_Dependency_Ratio"] = np.where(
        working_age > 0,
        (
            df["Under 18"]
            + df["65 to 74"]
            + df["75 Plus"]
        ) / working_age * 100,
        np.nan,
    )

    df["Age_Dependency_Ratio"] = df["Age_Dependency_Ratio"].round(1)

    return df[["year", "NAME", "Age_Dependency_Ratio", "geo_type"]]


def clean():
    raw_df = read_raw_data()
    df = replace_unavailable_data(raw_df)
    df = calculate_dependency_ratio(df)
    return df


def add_to_lake(clean_df: pd.DataFrame):
    """
    Writes the cleaned, long-format age_dependency_ratio dataframe
    to the CLEANED schema in DuckLake.
    """
    # Table naming schema
    # NOTE: {source}_{table-name}_{mode (ie. ts)}
    con.execute(
        """--sql
        CREATE OR REPLACE TABLE lake.CLEANED.acs5Demographics_ageDependencyRatio_timeseries AS
        SELECT * FROM clean_df
        """)


def main():
    clean_df = clean()
    add_to_lake(clean_df)


if __name__ == "__main__":
    main()
