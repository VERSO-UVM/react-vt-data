"""
**Author**:
    Ian Sargent
**Created**:
    2026-08-21
**Description**:
    Data cleaning script for creating an ACS5 snapshot table by
    combining selected indicators from multiple RAW tables in DuckLake.
**Run with**:
    python -m data_cleaning.clean_snapshot
"""

import pandas as pd

from lake_build import con


def read_raw_data() -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """
    Read the source tables from the RAW schema in DuckLake.
    """

    dem_df = con.execute(
        """--sql
        SELECT *
        FROM lake.RAW.demographics
        """
    ).df()

    housing_df = con.execute(
        """--sql
        SELECT *
        FROM lake.RAW.housing
        """
    ).df()

    econ_df = con.execute(
        """--sql
        SELECT *
        FROM lake.RAW.economic
        """
    ).df()

    return dem_df, housing_df, econ_df


def clean() -> pd.DataFrame:
    """
    Select the snapshot indicators from the source datasets
    and combine them into a single dataframe.
    """

    dem_df, housing_df, econ_df = read_raw_data()

    dem_vars = dem_df[dem_df["Variable"].isin(["Population (ACS)", "Median Age"])]

    housing_vars = housing_df[housing_df["Variable"].isin(["Median Home Value"])]

    econ_vars = econ_df[
        econ_df["Variable"].isin(
            ["Labor Force Participation Rate (16+)", "Median Household Income"]
        )
    ]

    combined = pd.concat([dem_vars, econ_vars, housing_vars], ignore_index=True)

    return combined


def add_to_lake(clean_df: pd.DataFrame):
    """
    Writes the cleaned snapshot dataframe
    to the CLEANED schema in DuckLake.
    """
    con.execute(
        """--sql
        CREATE OR REPLACE TABLE lake.CLEANED.acs5_snapshot_indicators_tidy AS
        SELECT * FROM clean_df
        """
    )


def main():
    clean_df = clean()
    add_to_lake(clean_df)


if __name__ == "__main__":
    main()
