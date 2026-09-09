"""
**Author**:
    Ian Sargent

**Created**:
    2026-07-14

**Description**:
    Data cleaning script for historic dependency ratio.
    Variable derived from the `RAW.demographics` DuckLake table, defined as:

    (Under 18 + 65 and Over) / (Ages 18-64)

**Run with**:
python -m data_cleaning.clean_dependency_ratio
"""

import duckdb
import numpy as np
import pandas as pd


def read_raw_data(con: duckdb.DuckDBPyConnection) -> pd.DataFrame:
    """
    Reading in the raw `demographics` table from lake.RAW schema.
    Filters to only age-group variables
    """
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
        """
    ).df()

    return raw_df


def replace_unavailable_data(df: pd.DataFrame) -> pd.DataFrame:
    """
    Converts census-designated missing values
    from -666666666 --> NA (numpy)
    """
    df["Value"] = df["Value"].replace(-666666666.0, np.nan)
    return df


def calculate_dependency_ratio(df: pd.DataFrame) -> pd.DataFrame:
    """
    Calculates age-dependency ratio as follows:
    **Age Dependency Ratio**
    [Dependent Ages (under 18 to 65+) ÷ Working Ages (18 - 64)]
    """
    # Pivot the table into wide format for column calculations
    df = df.pivot_table(
        index=["year", "NAME", "geo_type"],
        columns="Variable",
        values="Value",
        aggfunc="first",
    ).reset_index()

    # Total people of working age is the sum of all these age group columns
    working_age = (
        df["18 to 24"]
        + df["25 to 34"]
        + df["35 to 44"]
        + df["45 to 54"]
        + df["55 to 64"]
    )

    # Given that the working age population is above 0 (divide by 0 error),
    # Calculate the dependency ratio. Otherwise, NA
    df["Age_Dependency_Ratio"] = np.where(
        working_age > 0,
        (df["Under 18"] + df["65 to 74"] + df["75 Plus"]) / working_age * 100,
        np.nan,
    )

    # Round ratio to 1 decimal point for clarity
    df["Age_Dependency_Ratio"] = df["Age_Dependency_Ratio"].round(1)

    # Return df with these selected columns
    return df[["year", "NAME", "Age_Dependency_Ratio", "geo_type"]]


def clean(con: duckdb.DuckDBPyConnection) -> pd.DataFrame:
    raw_df = read_raw_data(con)
    df = replace_unavailable_data(raw_df)
    df = calculate_dependency_ratio(df)
    return df


def add_to_lake(clean_df: pd.DataFrame, con: duckdb.DuckDBPyConnection) -> None:
    """
    Writes the cleaned, long-format age_dependency_ratio dataframe
    to the CLEANED schema in DuckLake.
    """

    con.execute(
        """--sql
        CREATE OR REPLACE TABLE lake.CLEANED.acs5Demographics_ageDependencyRatio_timeseries AS
        SELECT * FROM clean_df
        """
    )


def main(con: duckdb.DuckDBPyConnection):
    clean_df = clean(con)
    add_to_lake(clean_df, con)


if __name__ == "__main__":
    main()
