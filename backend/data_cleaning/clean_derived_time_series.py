"""
**Author**:
    Ian Sargent
**Created**:
    2026-07-16
**Description**:
    Cleaning script for the single-variable timeseries tables
    (median age, median household income, median home value,
    per capita income, total housing units, vacancy rate).

    Pipeline steps:
    1. Read raw data
    2. Rename "county_subdivision" to "town"
    3. Enforce numeric data type
    4. Fix missing values
    5. Merge in "geoid", "county_fips", and "county" identifiers
    6. Write table to lake.CLEANED schema

**Run ALL datasets**:
python -m data_cleaning.clean_derived_time_series

**Run only a SUBSET (example):
python -m data_cleaning.clean_derived_time_series median_age vacancy_rate
"""

import argparse
import sys
from dataclasses import dataclass, field

import duckdb
import numpy as np
import pandas as pd

from lake_build import get_connection

UNAVAILABLE_SENTINEL = -666666666.0


@dataclass(frozen=True)
class DatasetConfig:
    source_table: str  # e.g. "demographics", "economic", "housing"
    variables: list[str]  # values to filter Variable on (IN clause)
    value_source_col: (
        str  # column holding the numeric value in RAW ("Value" or "Percent")
    )
    output_value_col: str  # name of the value column in the cleaned output
    output_table: str  # table name written under lake.CLEANED
    keep_variable_col: bool = field(
        default=False
    )  # keep Variable column (if  multi-variable dataset)
    extra_where_statement: str | None = field(
        default=None
    )  # additional AND-ed predicate, e.g. "Measure = 'Percent


CONFIGS: dict[str, DatasetConfig] = {
    # Median Age (from demographics)
    "median_age": DatasetConfig(
        source_table="demographics",
        variables=["Median Age"],
        value_source_col="Value",
        output_value_col="median_age",
        output_table="acs5Demographics_medianAge_timeseries",
    ),
    # Median HH Income (from economics)
    "median_hh_income": DatasetConfig(
        source_table="economic",
        variables=["Median Household Income"],
        value_source_col="Value",
        output_value_col="median_household_income",
        output_table="acs5Economics_medianHouseholdIncome_timeseries",
    ),
    # Median Home Value (from housing)
    "median_home_value": DatasetConfig(
        source_table="housing",
        variables=["Median Home Value"],
        value_source_col="Value",
        output_value_col="median_home_value",
        output_table="acs5Housing_medianHomeValue_timeseries",
    ),
    # Median Per Cap Income (from economics)
    "per_capita_income": DatasetConfig(
        source_table="economic",
        variables=["Per Capita Income"],
        value_source_col="Value",
        output_value_col="per_capita_income",
        output_table="acs5Economics_perCapitaIncome_timeseries",
    ),
    # Housing Units (from housing)
    "total_housing_units": DatasetConfig(
        source_table="housing",
        variables=["Total Housing Units"],
        value_source_col="Value",
        output_value_col="total_housing_units",
        output_table="acs5Housing_housingUnits_timeseries",
    ),
    # Vacancy Rate (from housing)
    "vacancy_rate": DatasetConfig(
        source_table="housing",
        variables=["Homeowner Vacancy Rate", "Rental Vacancy Rate"],
        value_source_col="Percent",
        output_value_col="percent",
        output_table="acs5Housing_vacancyRates_timeseries",
        keep_variable_col=True,
    ),
}


def read_raw_data(cfg: DatasetConfig, con: duckdb.DuckDBPyConnection) -> pd.DataFrame:
    select_parts = ["year", "NAME", "Jurisdiction", "county", "County_1", "state"]
    if cfg.keep_variable_col:
        select_parts.append("Variable")

    if cfg.output_value_col == cfg.value_source_col:
        select_parts.append(cfg.value_source_col)
    else:
        select_parts.append(f"{cfg.value_source_col} AS {cfg.output_value_col}")

    select_parts.append("geo_type")

    placeholders = ", ".join(["?"] * len(cfg.variables))
    where_clause = f"WHERE Variable IN ({placeholders})"
    if cfg.extra_where_statement:
        where_clause += f"\n        AND {cfg.extra_where_statement}"

    query = f"""--sql
        SELECT {", ".join(select_parts)}
        FROM lake.RAW.{cfg.source_table}
        {where_clause};
        """

    return con.execute(query, cfg.variables).df()


def change_dtype(df: pd.DataFrame, value_col: str) -> pd.DataFrame:
    df[value_col] = pd.to_numeric(df[value_col], errors="coerce")
    return df


def replace_unavailable_data(df: pd.DataFrame, value_col: str) -> pd.DataFrame:
    df[value_col] = df[value_col].replace(UNAVAILABLE_SENTINEL, np.nan)
    return df


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


def clean(con: duckdb.DuckDBPyConnection, cfg: DatasetConfig) -> pd.DataFrame:
    df = read_raw_data(cfg, con)
    df = change_dtype(df, cfg.output_value_col)
    df = replace_unavailable_data(df, cfg.output_value_col)
    df = clean_geo_type(df)
    df = rename_columns(df)
    df = add_geoid(con, df)

    columns = ["year", "name", "geoid", "county_fips", "county"]
    if cfg.keep_variable_col:
        columns.append("Variable")
    columns.append(cfg.output_value_col)
    columns.append("geo_type")

    return df[columns]


def add_to_lake(
    con: duckdb.DuckDBPyConnection, clean_df: pd.DataFrame, output_table: str
) -> None:
    """
    Writes a cleaned, long-format dataframe to the CLEANED schema in DuckLake.
    """
    con.execute(
        f"""--sql
        CREATE OR REPLACE TABLE lake.CLEANED.{output_table} AS
        SELECT * 
        FROM clean_df
        """
    )


def run(name: str, con: duckdb.DuckDBPyConnection) -> None:
    cfg = CONFIGS[name]
    clean_df = clean(con, cfg)
    add_to_lake(con, clean_df, cfg.output_table)


def main(con: duckdb.DuckDBPyConnection, names: list[str] | None = None) -> None:
    targets = names or list(CONFIGS)
    unknown = [n for n in targets if n not in CONFIGS]

    if unknown:
        sys.exit(
            f"Unknown dataset(s): {', '.join(unknown)}. Choices: {', '.join(CONFIGS)}"
        )

    for name in targets:
        run(name, con)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Clean one or more RAW DuckLake tables."
    )
    parser.add_argument(
        "datasets",
        nargs="*",
        choices=list(CONFIGS),
        help="Dataset name(s) to clean. Omit to run all.",
        metavar="DATASET",
    )
    con = get_connection()

    try:
        args = parser.parse_args()
        main(con, args.datasets or None)
    finally:
        con.close()
