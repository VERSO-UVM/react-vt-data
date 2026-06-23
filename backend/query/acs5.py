"""
**Author**:
    Ian Sargent
**Created**:
    2026-06-09
**Description**:
    Functions for serving Census ACS 5-year estimates data to the API from the parquet files.
"""

import logging
from pathlib import Path
import pandas as pd

from query.core_functions import build_where_query_from_filters, filter_tree
from query.processed_db import DB

# import duckdb
# _DB_PATH = Path(__file__).resolve().parent.parent / "Data" / "vt_data.duckdb"
# DB = duckdb.connect(str(_DB_PATH), read_only=True)


logger = logging.getLogger(__name__)
sql_path = Path(__file__).resolve().parent / "sql" / "acs5"

QUERY_CONFIG = {
    "demographics": {
        "table": "acs5_b10_census",
        "base_conditions": None,
    },
    "education": {
        "table": "acs5_b15003_education",
        "base_conditions": None,
    },
    "housing": {
        "table": "acs5_b_housing",
        "base_conditions": None,
    },
    "labor_force": {
        "table": "acs5_b_economic",
        "base_conditions": ["Section = 'Labor Force'"],
    },
    "income": {
        "table": "acs5_b_economic",
        "base_conditions": ["Section = 'Income'"],
    },
    "median_age": {
        "table": "acs5_b10_census",
        "base_conditions": ["Variable = 'Median Age'"],
    },
}

# frontend filter label -> database column
ACS5_FILTER_COLS = {"Location": "NAME"}
ACS5_TREE_LABELS = ["Location"]


def get_acs5_tidy(
    dataset: str, name: str, year_min: int, year_max: int, filters: dict | None = None
) -> pd.DataFrame:
    config = QUERY_CONFIG.get(dataset)
    query_filters = {"Location": name, **(filters or {})}
    base_conditions = list(config["base_conditions"] or [])
    base_conditions.append(f"CAST(year AS INTEGER) BETWEEN {year_min} AND {year_max}")

    where_string = build_where_query_from_filters(
        filters=query_filters,
        colmap=ACS5_FILTER_COLS,
        table=config["table"],
        base_conditions=base_conditions,
    )

    sql = (
        (sql_path / "acs5_tidy.sql")
        .read_text()
        .format(table=config["table"], where_string=where_string)
    )

    result = DB.execute(sql).df()

    if result is None:
        logger.error(
            "ACS5 tidy query returned no rows for dataset: %s, name: %s, filters: %s",
            dataset,
            name,
            filters,
        )
        raise ValueError(
            f"no results for dataset: {dataset}, name: {name}, filters: {filters}"
        )

    return result


def get_unemployment_rate_ts(
    filters: dict | None = None,
    year_min: int | None = None,
    year_max: int | None = None,
) -> pd.DataFrame:
    query_filters = filters or {}

    base_conditions = []

    if year_min is not None and year_max is not None:
        base_conditions.append(
            f"CAST(year AS INTEGER) BETWEEN {year_min} AND {year_max}"
        )

    where_string = build_where_query_from_filters(
        filters=query_filters,
        colmap=ACS5_FILTER_COLS,
        table="acs5_unemployment_rate",
        base_conditions=base_conditions,
    )

    sql = (
        (sql_path / "unemployment_rate.sql")
        .read_text()
        .format(where_string=where_string)
    )

    result = DB.execute(sql).df()

    if result is None or result.empty:
        logger.error(
            "Unemployment rate query returned no rows for filters=%s year_min=%s year_max=%s",
            filters,
            year_min,
            year_max,
        )
        raise ValueError("no results for unemployment_rate query")

    return result


def get_median_earnings(
    filters: dict | None = None,
    year_min: int | None = None,
    year_max: int | None = None,
) -> pd.DataFrame:
    query_filters = filters or {}

    base_conditions = []

    if year_min is not None and year_max is not None:
        base_conditions.append(
            f"CAST(year AS INTEGER) BETWEEN {year_min} AND {year_max}"
        )

    where_string = build_where_query_from_filters(
        filters=query_filters,
        colmap=ACS5_FILTER_COLS,
        table="acs5_median_earnings",
        base_conditions=base_conditions,
    )

    sql = (
        (sql_path / "median_earnings.sql").read_text().format(where_string=where_string)
    )

    result = DB.execute(sql).df()

    if result is None or result.empty:
        logger.error(
            "Median earnings query returned no rows for filters=%s year_min=%s year_max=%s",
            filters,
            year_min,
            year_max,
        )
        raise ValueError("no results for median_earnings query")

    return result


def get_acs5_filters():
    return filter_tree(ACS5_FILTER_COLS, ACS5_TREE_LABELS, "acs5_info")
