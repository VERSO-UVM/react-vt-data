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
from query.core_functions import filter_tree
from sql_render import sql_filter_block
from query.processed_db import DB

logger = logging.getLogger(__name__)
sql_path = Path(__file__).resolve().parent / "sql" / "acs5"

# Per-dataset FIXED filters, expressed as {column: [values]} and folded into the
# FilterSource (these replace the old raw-SQL base_conditions)
QUERY_CONFIG = {
    "demographics": {"table": "acs5_b10_census", "fixed_filters": {}},
    "education": {"table": "acs5_b15003_education", "fixed_filters": {}},
    "housing": {"table": "acs5_b_housing", "fixed_filters": {}},
    "labor_force": {
        "table": "acs5_b_economic",
        "fixed_filters": {"Section": ["Labor Force"]},
    },
    "income": {"table": "acs5_b_economic", "fixed_filters": {"Section": ["Income"]}},
    "median_age": {
        "table": "acs5_b10_census",
        "fixed_filters": {"Variable": ["Median Age"]},
    },
    "snapshot": {"table": "acs5_snapshot", "fixed_filters": {}},
}

# frontend filter label -> database column. Location and the year range both
# travel inside `filters`; unknown labels (e.g. County/Jurisdiction sent for other
# datasets) are ignored.
ACS5_FILTER_COLS = {"Location": "NAME", "year": "year"}
ACS5_TREE_LABELS = ["Location"]


<<<<<<< Updated upstream
def _acs5_source(
    table: str,
    filters: dict | None = None,
    fixed_filters: dict | None = None,
) -> FilterSource:
    """Build a FilterSource for direct single-table ACS filtering.
=======
def get_acs5_tidy(
    dataset: str, name: str, year_min: int, year_max: int, filters: dict | None = None
) -> pd.DataFrame:
    config = QUERY_CONFIG.get(dataset)
    query_filters = {"Location": name, **(filters or {})}
    base_conditions = list(config["base_conditions"] or [])
    base_conditions.append(f"CAST(year AS INTEGER) BETWEEN {year_min} AND {year_max}")
>>>>>>> Stashed changes

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
<<<<<<< Updated upstream
        filters=filters,
        fixed_filters=config["fixed_filters"],
    )

    sql, params = sql_filter_block(sql_path / "acs5_tidy.sql", [source])
=======
        base_conditions=base_conditions,
    )

    sql = (
        (sql_path / "acs5_tidy.sql")
        .read_text()
        .format(table=config["table"], where_string=where_string)
    )
>>>>>>> Stashed changes

    result = DB.execute(sql, params).df()

    if result is None:
        logger.error(
<<<<<<< Updated upstream
            "ACS5 tidy query returned no rows for dataset: %s, filters: %s",
            dataset,
            filters,
        )
        raise ValueError(f"no results for dataset: {dataset}, filters: {filters}")
=======
            "ACS5 tidy query returned no rows for dataset: %s, name: %s, filters: %s",
            dataset,
            name,
            filters,
        )
        raise ValueError(
            f"no results for dataset: {dataset}, name: {name}, filters: {filters}"
        )
>>>>>>> Stashed changes

    return result


<<<<<<< Updated upstream
def get_unemployment_rate_ts(filters: dict | None = None) -> pd.DataFrame:
    source = _acs5_source(table="acs5_unemployment_rate", filters=filters)
=======
def get_unemployment_rate_ts(
    filters: dict | None = None,
    year_min: int | None = None,
    year_max: int | None = None,
) -> pd.DataFrame:
    query_filters = filters or {}
>>>>>>> Stashed changes

    sql, params = sql_filter_block(sql_path / "unemployment_rate.sql", [source])

<<<<<<< Updated upstream
    result = DB.execute(sql, params).df()

    if result is None or result.empty:
        logger.error("Unemployment rate query returned no rows for filters=%s", filters)
=======
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
>>>>>>> Stashed changes
        raise ValueError("no results for unemployment_rate query")

    return result


<<<<<<< Updated upstream
def get_median_earnings(filters: dict | None = None) -> pd.DataFrame:
    source = _acs5_source(table="acs5_median_earnings", filters=filters)
=======
def get_median_earnings(
    filters: dict | None = None,
    year_min: int | None = None,
    year_max: int | None = None,
) -> pd.DataFrame:
    query_filters = filters or {}
>>>>>>> Stashed changes

    sql, params = sql_filter_block(sql_path / "median_earnings.sql", [source])

<<<<<<< Updated upstream
    result = DB.execute(sql, params).df()

    if result is None or result.empty:
        logger.error("Median earnings query returned no rows for filters=%s", filters)
=======
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
>>>>>>> Stashed changes
        raise ValueError("no results for median_earnings query")

    return result


def get_snapshot(filters: dict | None = None) -> pd.DataFrame:
    source = _acs5_source(table="snapshot", filters=filters)

    sql, params = sql_filter_block(sql_path / "snapshot.sql", [source])

    result = DB.execute(sql, params).df()

    if result is None or result.empty:
        logger.error("Snapshot query returned no rows for filters=%s", filters)
        raise ValueError("no results for snapshot query")

    return result


def get_acs5_filters():
    return filter_tree(ACS5_FILTER_COLS, ACS5_TREE_LABELS, "acs5_info")
