"""
**Author**:
    Ian Sargent
**Created**:
    2026-07-13
**Description**:
    Data cleaning script for the raw (curated variables) `education`
    table in the DuckLake
**Run with**:
python -m data_cleaning.clean_education
"""

import duckdb
import pandas as pd


def read_raw_data(con: duckdb.DuckDBPyConnection) -> pd.DataFrame:
    raw_df = con.execute(
        """--sql
        SELECT * 
        FROM lake.RAW.education
        """
    ).df()

    return raw_df


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
            "NAME": "name",
        },
        inplace=True,
    )

    df["county_fips"] = df["state_fips"].astype("string") + df["county_fips"].astype(
        "string"
    )
    df.drop(columns=["state_fips"], inplace=True)

    return df


def add_geoid(con: duckdb.DuckDBPyConnection, df: pd.DataFrame) -> pd.DataFrame:
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
    df_with_geoid.drop(columns=["county_name"], inplace=True)

    return df_with_geoid


def clean(con: duckdb.DuckDBPyConnection):
    raw_df = read_raw_data(con)
    df = clean_geo_type(raw_df)
    df = rename_columns(df)
    df = add_geoid(con, df)
    df.columns = df.columns.str.lower()

    return df[
        [
            "year",
            "geoid",
            "name",
            "geo_type",
            "county",
            "county_fips",
            "section",
            "variable",
            "value",
            "percent",
        ]
    ]


def add_to_lake(con: duckdb.DuckDBPyConnection, clean_df: pd.DataFrame):
    """
    Writes the cleaned education dataframe
    to the CLEANED schema in DuckLake.
    """
    con.execute(
        """--sql
        CREATE OR REPLACE TABLE lake.CLEANED.acs5_education_tidy AS
        SELECT * FROM clean_df
        """
    )


def main(con: duckdb.DuckDBPyConnection):
    clean_df = clean(con)
    add_to_lake(con, clean_df)


if __name__ == "__main__":
    main()
