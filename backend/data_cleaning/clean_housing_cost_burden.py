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
            state,
            county,
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
            geo_type,
            state,
            county
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


def clean(
    con: duckdb.DuckDBPyConnection,
) -> pd.DataFrame:
    raw_df = read_raw_data(con, MORTGAGE_SUBCATEGORY)
    df = change_dtype(raw_df)
    df = replace_unavailable_data(df)
    df = clean_geo_type(df)
    df = add_geoid(con, df)

    return df[
        ["year", "name", "geoid", "county_fips", "pct_housing_burden", "geo_type"]
    ]


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
