"""
**Author**:
    Ian Sargent
**Created**:
    2026-07-16
**Description**:
    Cleaning script for the single-variable timeseries tables
    (median age, median household income, median home value,
    per capita income, total housing units,vacancy rate, unemployment_rate).

    Pipeline steps:
    1. Read raw data
    2. Rename "county_subdivision" to "town"
    3. Enforce numeric data type
    4. Fix missing values
    5. Write table to lake.CLEANED schema

**Run ALL datasets**:
python -m data_cleaning.clean_derived_time_series

**Run only a SUBSET (example):
python -m data_cleaning.clean_derived_time_series median_age vacancy_rate
"""

import argparse
import sys
from dataclasses import dataclass, field

import numpy as np
import pandas as pd

from datastore.lake_build import con

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
        output_value_col="Median_Age",
        output_table="acs5Demographics_medianAge_timeseries",
    ),
    # Median HH Income (from economics)
    "median_hh_income": DatasetConfig(
        source_table="economic",
        variables=["Median Household Income"],
        value_source_col="Value",
        output_value_col="Median_Household_Income",
        output_table="acs5Economics_medianHouseholdIncome_timeseries",
    ),
    # Median Home Value (from housing)
    "median_home_value": DatasetConfig(
        source_table="housing",
        variables=["Median Home Value"],
        value_source_col="Value",
        output_value_col="Median_Home_Value",
        output_table="acs5Housing_medianHomeValue_timeseries",
    ),
    # Median Per Cap Income (from economics)
    "per_capita_income": DatasetConfig(
        source_table="economic",
        variables=["Per Capita Income"],
        value_source_col="Value",
        output_value_col="Per_Capita_Income",
        output_table="acs5Economics_perCapitaIncome_timeseries",
    ),
    # Housing Units (from housing)
    "total_housing_units": DatasetConfig(
        source_table="housing",
        variables=["Total Housing Units"],
        value_source_col="Value",
        output_value_col="Total_Housing_Units",
        output_table="acs5Housing_housingUnits_timeseries",
    ),
    # Vacancy Rate (from housing)
    "vacancy_rate": DatasetConfig(
        source_table="housing",
        variables=["Homeowner Vacancy Rate", "Rental Vacancy Rate"],
        value_source_col="Percent",
        output_value_col="Percent",
        output_table="acs5Housing_vacancyRates_timeseries",
        keep_variable_col=True,
    ),
    "unemployment_rate": DatasetConfig(
        source_table="acs5_economic",
        variables=["Unemployment Rate"],
        value_source_col="Value",
        output_value_col="Unemployment_Rate",
        output_table="acs5Economics_unemploymentRate_timeseries",
        extra_where_statement="Measure = 'Percent'",
    ),
}


def read_raw_data(cfg: DatasetConfig) -> pd.DataFrame:
    select_parts = ["year", "NAME"]
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


def clean(cfg: DatasetConfig) -> pd.DataFrame:
    df = read_raw_data(cfg)
    df = change_dtype(df, cfg.output_value_col)
    df = replace_unavailable_data(df, cfg.output_value_col)
    return df


def add_to_lake(clean_df: pd.DataFrame, output_table: str) -> None:
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


def run(name: str) -> None:
    cfg = CONFIGS[name]
    clean_df = clean(cfg)
    add_to_lake(clean_df, cfg.output_table)


def main(names: list[str] | None = None) -> None:
    targets = names or list(CONFIGS)
    unknown = [n for n in targets if n not in CONFIGS]

    if unknown:
        sys.exit(
            f"Unknown dataset(s): {', '.join(unknown)}. Choices: {', '.join(CONFIGS)}"
        )

    for name in targets:
        run(name)


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
    args = parser.parse_args()
    main(args.datasets or None)
