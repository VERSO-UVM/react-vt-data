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

    Also merges in "geoid", "county_fips", and "county" identifiers.

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
            Jurisdiction,
            county,
            County_1,
            state,
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
    df = calculate_pct_change(df)
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
            "Population",
            "Pct_Population_Change",
            "geo_type",
        ]
    ]


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
