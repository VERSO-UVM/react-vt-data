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

logger = logging.getLogger(__name__)
sql_path = Path(__file__).resolve().parent / "sql" / "acs5"

QUERY_CONFIG = {
    "demographics": {
        "table": "b10_census",
        "base_conditions": None,
    },
    "education": {
        "table": "b15003_education",
        "base_conditions": None,
    },
    "housing": {
        "table": "b_housing",
        "base_conditions": None,
    },
    "labor_force": {
        "table": "b_economic",
        "base_conditions": ["Section = 'Labor Force'"],
    },
    "income": {
        "table": "b_economic",
        "base_conditions": ["Section = 'Income'"],
    },
    "median_age": {
        "table": "b10_census",
        "base_conditions": ["Variable = 'Median Age'"],
    },
}

# frontend filter label -> database column
ACS5_FILTER_COLS = {"Location": "NAME", }
ACS5_TREE_LABELS = ["Location"]


def get_acs5_tidy(dataset: str, filters: dict | None = None) -> pd.DataFrame:
    config = QUERY_CONFIG.get(dataset)
    if config is None:
        raise ValueError(f"Unknown ACS5 dataset: {dataset}")

    where_string = build_where_query_from_filters(
        filters=filters,
        colmap=ACS5_FILTER_COLS,
        table=config["table"],
        base_conditions=config["base_conditions"])

    sql = (sql_path / "acs5_tidy.sql").read_text().format(
        table=config["table"], where_string=where_string)

    result = DB.execute(sql).df()

    if result is None:
        logger.error("%s query returned no rows for filters: %s",
                     dataset, filters)
        raise ValueError(f"no results for filters: {filters}")

    return result


def get_unemployment_rate_ts(filters: dict | None = None) -> pd.DataFrame:
    where_string = build_where_query_from_filters(
        filters=filters,
        colmap=ACS5_FILTER_COLS,
        table="b_economic",
        base_conditions=["Section = 'Labor Force'", "Variable = 'Unemployment Rate'"])

    sql = (sql_path / "unemployment_rate.sql").read_text().format(
        where_string=where_string)

    result = DB.execute(sql).df()

    if result is None:
        logger.error(
            "Unemployment rate query returned no rows for filters: %s", filters)
        raise ValueError(f"no results for filters: {filters}")

    return result


def get_acs5_filters():
    return filter_tree(ACS5_FILTER_COLS, ACS5_TREE_LABELS, "acs5_info")
