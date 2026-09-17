"""
**Author**:
    Ian Sargent
**Created**:
    2026-07-14
**Description**:
    Data cleaning script for health insurance coverage.
    Derived from the `RAW.acs5_economic` DuckLake table.

    Also merges in "geoid" and "county_fips" identifiers.
**Run with**:
python -m data_cleaning.clean_health_insurance_coverage
"""

import duckdb
import numpy as np
import pandas as pd


def read_raw_data(con: duckdb.DuckDBPyConnection) -> pd.DataFrame:
    raw_df = con.execute(
        """--sql
        SELECT year, NAME, Variable, Value, geo_type, state, county
        FROM lake.RAW.acs5_economic
        WHERE Category LIKE '%INSURANCE%'
        AND Subcategory = 'Civilian noninstitutionalized population'
        AND Variable IN (
            'With health insurance coverage: With public coverage',
            'With health insurance coverage: With private health insurance',
            'No health insurance coverage'
        )
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


def clean_geo_type(df: pd.DataFrame) -> pd.DataFrame:
    df["geo_type"] = df["geo_type"].replace("county_subdivision", "town")
    return df


def add_geoid(con: duckdb.DuckDBPyConnection, df: pd.DataFrame) -> pd.DataFrame:
    """
    Attach `geoid` (town GEOID, county FIPS, or state FIPS depending on
    `geo_type`) and `county_fips`
    """
    df_with_geoid = con.execute(
        """--sql
        SELECT
            g.* EXCLUDE (geoid),
            CASE
                WHEN g.geo_type IN ('county', 'town') THEN LEFT(g.geoid, 5)
            END AS county_fips,
            g.geoid
        FROM (
            SELECT
                df.* EXCLUDE (state, county),
                CASE
                    WHEN df.geo_type = 'town' THEN town_geoids.GEOID
                    WHEN df.geo_type = 'county' THEN CONCAT(df.state, df.county)
                    WHEN df.geo_type = 'state' THEN '50'
                END AS geoid
            FROM df
            LEFT JOIN lake.RAW.vt_town_lines AS town_geoids
            ON df.NAME = town_geoids.NAME
        ) AS g
        """
    ).df()

    df_with_geoid.rename(columns={"NAME": "name"}, inplace=True)

    return df_with_geoid


def clean(con: duckdb.DuckDBPyConnection) -> pd.DataFrame:
    raw_df = read_raw_data(con)
    df = change_dtype(raw_df)
    df = replace_unavailable_data(df)
    df = clean_geo_type(df)
    df = add_geoid(con, df)

    return df[["year", "name", "geoid", "county_fips", "Variable", "Value", "geo_type"]]


def add_to_lake(con: duckdb.DuckDBPyConnection, clean_df: pd.DataFrame) -> None:
    """
    Writes the cleaned, long-format health_insurance_coverage dataframe
    to the CLEANED schema in DuckLake.
    """
    con.execute(
        """--sql
        CREATE OR REPLACE TABLE lake.CLEANED.acs5Economics_healthInsurance_timeseries AS
        SELECT * FROM clean_df
        """
    )


def main(con: duckdb.DuckDBPyConnection):
    clean_df = clean(con)
    add_to_lake(con, clean_df)


if __name__ == "__main__":
    main()
