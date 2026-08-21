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

from api.models import FilterSource, RangeFilter
from app_utils.sql_render import sql_filter_block
from query.core_functions import filter_tree
from query.processed_db import DB

logger = logging.getLogger(__name__)
sql_path = Path(__file__).resolve().parent / "sql" / "acs5"

# Per-dataset FIXED filters, expressed as {column: [values]} and folded into the
# FilterSource (these replace the old raw-SQL base_conditions)
QUERY_CONFIG = {
    "demographics": {
        "table": "acs5_demographics_tidy",
        "fixed_filters": {},
        "timeseries": {
            "age_dependency_ratio": {
                "table": "acs5Demographics_ageDependencyRatio_timeseries",
                "fixed_filters": {},
            },
            "median_age": {
                "table": "acs5Demographics_medianAge_timeseries",
                "fixed_filters": {},
            },
            "historic_population": {
                "table": "VCGI_historicPopulation_timeseries",
                "fixed_filters": {},
            },
        },
    },
    "economics": {
        "table": "acs5_economics_tidy",
        "fixed_filters": {},
        "timeseries": {
            "health_insurance": {
                "table": "acs5Economics_healthInsurance_timeseries",
                "fixed_filters": {},
            },
            "household_income": {
                "table": "acs5Economics_medianHouseholdIncome_timeseries",
                "fixed_filters": {},
            },
            "per_capita_income": {
                "table": "acs5Economics_perCapitaIncome_timeseries",
                "fixed_filters": {},
            },
            "unemployment_rate": {
                "table": "acs5Economics_unemploymentRate_timeseries",
                "fixed_filters": {},
            },
        },
    },
    "labor_force": {
        "table": "acs5_economics_tidy",
        "fixed_filters": {"Section": ["Labor Force"]},
        "timeseries": {},
    },
    "income": {
        "table": "acs5_economics_tidy",
        "fixed_filters": {"Section": ["Income"]},
        "timeseries": {},
    },
    "housing": {
        "table": "acs5_housing_tidy",
        "fixed_filters": {},
        "timeseries": {
            "housing_units": {
                "table": "acs5Housing_housingUnits_timeseries",
                "fixed_filters": {},
            },
            "median_home_value": {
                "table": "acs5Housing_medianHomeValue_timeseries",
                "fixed_filters": {},
            },
            "vacancy_rates": {
                "table": "acs5Housing_vacancyRates_timeseries",
                "fixed_filters": {},
            },
        },
    },
    "education": {
        "table": "acs5_education_tidy",
        "fixed_filters": {},
        "timeseries": {},
    },
    "snapshot": {
        "table": "acs5_snapshot_indicators_tidy",
        "fixed_filters": {},
        "timeseries": {},
    },
}

# frontend filter label -> database column. Location and the year range both
# travel inside `filters`; unknown labels (e.g. County/Jurisdiction sent for other
# datasets) are ignored.
ACS5_FILTER_COLS = {"Location": "NAME", "year": "year"}
ACS5_TREE_LABELS = ["Location"]


def _acs5_source(
    table: str,
    filters: dict | None = None,
    fixed_filters: dict | None = None,
) -> FilterSource:
    """Build a FilterSource for direct single-table ACS filtering.

    Maps request-supplied label-keyed filters (Location, year range) via
    ACS5_FILTER_COLS and folds in the dataset's fixed filters. RangeFilter values
    pass through unchanged; scalars/lists become IN lists.
    """
    src_filters: dict = {}
    for label, val in (filters or {}).items():
        col = ACS5_FILTER_COLS.get(label)
        if col is None or val is None:
            continue
        if isinstance(val, (list, tuple, set, RangeFilter)):
            src_filters[col] = val
        else:
            src_filters[col] = [val]
    src_filters.update(fixed_filters or {})
    return FilterSource(filter_table=table, filters=src_filters)


def get_acs5_tidy(dataset: str, filters: dict | None = None) -> pd.DataFrame:
    config = QUERY_CONFIG[dataset]
    source = _acs5_source(
        table=config["table"],
        filters=filters,
        fixed_filters=config["fixed_filters"],
    )

    sql, params = sql_filter_block(sql_path / "acs5_tidy.sql", [source])

    result = DB.execute(sql, params).df()

    if result.empty:
        logger.error(
            "ACS5 tidy query returned no rows for dataset: %s, filters: %s",
            dataset,
            filters,
        )
        raise ValueError(f"no results for dataset: {dataset}, filters: {filters}")

    return result


def get_acs5_timeseries(
    category: str,
    dataset: str,
    filters: dict | None = None,
) -> pd.DataFrame:
    try:
        config = QUERY_CONFIG[category]["timeseries"][dataset]
    except KeyError as e:
        raise ValueError(f"Unknown ACS5 timeseries: {category}/{dataset}") from e

    source = _acs5_source(
        table=config["table"],
        filters=filters,
        fixed_filters=config.get("fixed_filters"),
    )

    sql, params = sql_filter_block(
        sql_path / "acs5_timeseries.sql",
        [source],
    )

    result = DB.execute(sql, params).df()

    if result.empty:
        logger.error(
            "ACS5 timeseries query returned no rows for category=%s, "
            "dataset=%s, filters=%s",
            category,
            dataset,
            filters,
        )
        raise ValueError(
            f"No results for timeseries: {category}/{dataset}, filters: {filters}"
        )

    return result


# FIXME: Link to new database table name (broken for now)
def get_median_earnings_ts(filters: dict | None = None) -> pd.DataFrame:
    source = _acs5_source(table="acs5_median_earnings", filters=filters)

    sql, params = sql_filter_block(sql_path / "median_earnings.sql", [source])

    result = DB.execute(sql, params).df()

    if result is None or result.empty:
        logger.error("Median earnings query returned no rows for filters=%s", filters)
        raise ValueError("no results for median_earnings query")

    return result


# FIXME: Link to new database table name (broken for now)
def get_acs5_filters():
    return filter_tree(ACS5_FILTER_COLS, ACS5_TREE_LABELS, "acs5_info")
