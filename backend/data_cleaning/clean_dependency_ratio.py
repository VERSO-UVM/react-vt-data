"""
**Author**:
    Ian Sargent

**Created**:
    2026-07-14

**Description**:
    Data cleaning script for historic dependency ratio.
    Variable derived from the `RAW.demographics` DuckLake table, defined as:

    (Under 18 + 65 and Over) / (Ages 18-64)

    Also merges in "geoid", "county_fips", and "county" identifiers.

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
            Jurisdiction,
            county,
            County_1,
            state,
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
    # Geo-id columns don't vary by Variable within a (year, NAME, geo_type)
    # group, but county/state/national rows have NaNs in some of them
    # (e.g. no Jurisdiction outside of towns). Pulling them out before the
    # pivot avoids pandas silently dropping those rows, since pivot_table's
    # underlying groupby excludes any row with a NaN in the index.
    geo_cols = df[
        ["year", "NAME", "geo_type", "Jurisdiction", "county", "County_1", "state"]
    ].drop_duplicates(subset=["year", "NAME", "geo_type"])

    # Pivot the table into wide format for column calculations
    df = df.pivot_table(
        index=["year", "NAME", "geo_type"],
        columns="Variable",
        values="Value",
        aggfunc="first",
    ).reset_index()

    df = df.merge(geo_cols, on=["year", "NAME", "geo_type"], how="left")

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
    df["age_dependency_ratio"] = np.where(
        working_age > 0,
        (df["Under 18"] + df["65 to 74"] + df["75 Plus"]) / working_age * 100,
        np.nan,
    )

    # Round ratio to 1 decimal point for clarity
    df["age_dependency_ratio"] = df["age_dependency_ratio"].round(1)

    # Return df with these selected columns
    return df[
        [
            "year",
            "NAME",
            "age_dependency_ratio",
            "geo_type",
            "Jurisdiction",
            "county",
            "County_1",
            "state",
        ]
    ]


def clean_geo_type(df: pd.DataFrame) -> pd.DataFrame:
    df["geo_type"] = df["geo_type"].replace("county_subdivision", "town")
    return df


def rename_columns(df: pd.DataFrame) -> pd.DataFrame:
    df.rename(
        columns={
            "Jurisdiction": "town",
            "county": "county_fips",
            "County_1": "county",
            "state": "state_fips",
        },
        inplace=True,
    )

    df["county_fips"] = df["state_fips"].astype("string") + df["county_fips"].astype(
        "string"
    )
    df.drop(columns=["state_fips"], inplace=True)

    return df


def add_geoid(con: duckdb.DuckDBPyConnection, df: pd.DataFrame) -> pd.DataFrame:
    """
    Attach a `geoid` (town GEOID, county FIPS, or state FIPS depending
    on `geo_type`) and resolved `county` name.
    """
    df_with_geoid = con.execute(
        """--sql
        SELECT
            df.*,
            town_geoids.GEOID AS GEOID,
            county_names.CNTYNAME AS county_name
        FROM df
        LEFT JOIN lake.RAW.vt_town_lines AS town_geoids
        ON df.town = TRIM(SPLIT_PART(town_geoids.NAME, ',', 1))
        LEFT JOIN lake.RAW.vt_county_lines AS county_names
        ON df.county_fips = county_names.CNTYGEOID
        """
    ).df()

    df_with_geoid["GEOID"] = df_with_geoid["GEOID"].case_when(
        [
            (
                (df_with_geoid["geo_type"] == "county")
                & (df_with_geoid["GEOID"].isna()),
                df_with_geoid["county_fips"],
            ),
            (
                (df_with_geoid["geo_type"] == "state")
                & (df_with_geoid["GEOID"].isna()),
                "50",
            ),
        ]
    )

    df_with_geoid["county"] = df_with_geoid["county"].case_when(
        [
            (
                (df_with_geoid["geo_type"] == "county")
                & (df_with_geoid["county"].isna()),
                df_with_geoid["county_name"],
            ),
        ]
    )

    df_with_geoid["county"] = df_with_geoid["county"].str.title()

    df_with_geoid.rename(columns={"GEOID": "geoid"}, inplace=True)
    df_with_geoid.rename(columns={"NAME": "name"}, inplace=True)
    df_with_geoid.drop(columns=["county_name", "town"], inplace=True)

    return df_with_geoid


def clean(con: duckdb.DuckDBPyConnection) -> pd.DataFrame:
    raw_df = read_raw_data(con)
    df = replace_unavailable_data(raw_df)
    df = calculate_dependency_ratio(df)
    df = clean_geo_type(df)
    df = rename_columns(df)
    df = add_geoid(con, df)

    return df[
        [
            "year",
            "name",
            "geoid",
            "county_fips",
            "county",
            "age_dependency_ratio",
            "geo_type",
        ]
    ]


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
