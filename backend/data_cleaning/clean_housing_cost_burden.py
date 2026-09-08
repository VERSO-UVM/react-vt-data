"""
**Author**:
    Ian Sargent
**Created**:
    2026-07-14
**Description**:
    Data cleaning script for housing cost burden.

    Housing cost burden is defined as the percentage of housing units
    spending 30% or more of household income on housing.

    Variable path:
    DP04 -> SELECTED MONTHLY OWNER COSTS AS A PERCENTAGE OF HOUSEHOLD INCOME (SMOCAPI)

    Includes:
        - 30.0 to 34.9 percent
        - 35.0 percent or more

    The two percentage categories are summed to produce the derived
    `pct_housing_burden` measure.

    Derived from the `RAW.acs5_housing` DuckLake table.

**Run with**:
    python -m data_cleaning.clean_housing_cost_burden
"""

import duckdb
import numpy as np
import pandas as pd

MORTGAGE_SUBCATEGORY = (
    "Housing units with a mortgage (excluding units where SMOCAPI cannot be computed)"
)

NO_MORTGAGE_SUBCATEGORY = (
    "Housing unit without a mortgage (excluding units where SMOCAPI cannot be computed)"
)


def read_raw_data(con: duckdb.DuckDBPyConnection, subcategory: str) -> pd.DataFrame:
    """
    Read and aggregate housing cost burden percentages for a subcategory.

    Housing burden is defined as spending 30% or more of household income
    on housing, combining the 30.0-34.9% and 35.0%+ categories.
    """
    raw_df = con.execute(
        """--sql
        SELECT
            year,
            NAME,
            geo_type,
            SUM(TRY_CAST(Value AS DOUBLE)) AS pct_housing_burden
        FROM lake.RAW.acs5_housing
        WHERE Category LIKE '%SELECTED MONTHLY OWNER COSTS AS A PERCENTAGE OF HOUSEHOLD INCOME%'
            AND Subcategory = ?
            AND Variable IN (
                '30.0 to 34.9 percent',
                '35.0 percent or more'
            )
            AND Measure = 'Percent'
        GROUP BY
            year,
            NAME,
            geo_type
        ORDER BY year;
        """,
        [subcategory],
    ).df()

    return raw_df


def change_dtype(df: pd.DataFrame) -> pd.DataFrame:
    df["pct_housing_burden"] = pd.to_numeric(
        df["pct_housing_burden"],
        errors="coerce",
    )

    return df


def replace_unavailable_data(df: pd.DataFrame) -> pd.DataFrame:
    df["pct_housing_burden"] = df["pct_housing_burden"].replace(
        -666666666.0,
        np.nan,
    )

    return df


def clean(
    con: duckdb.DuckDBPyConnection,
) -> pd.DataFrame:
    raw_df = read_raw_data(con, MORTGAGE_SUBCATEGORY)
    df = change_dtype(raw_df)
    df = replace_unavailable_data(df)

    return df


def add_to_lake(con: duckdb.DuckDBPyConnection, clean_df: pd.DataFrame):
    """
    Writes the cleaned, long-format housing cost burden dataframe
    to the CLEANED schema in DuckLake.
    """
    con.execute(
        """--sql
        CREATE OR REPLACE TABLE lake.CLEANED.acs5Housing_incomeBurden_timeseries AS
        SELECT * FROM clean_df
        """
    )


def main(con: duckdb.DuckDBPyConnection):
    clean_df = clean(con)
    add_to_lake(con, clean_df)


if __name__ == "__main__":
    main()
