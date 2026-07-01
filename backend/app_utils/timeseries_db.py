"""
DuckDB-backed access to the census time-series tables in vt_data.duckdb.

Use query_timeseries(table_name, filters) to filter any registered table.
"""

import logging

from app_utils.db import DB

logger = logging.getLogger(__name__)

# Allowed filter columns per table (whitelist guards against injection)
_VALID_COLS: dict[str, set[str]] = {
    "unemployment_rate": {
        "year",
        "GEOID",
        "NAME",
        "Jurisdiction",
        "County",
        "Unemployment_Rate",
    },
    "median_earnings": {
        "year",
        "GEOID",
        "NAME",
        "Jurisdiction",
        "County",
        "variable",
        "Value",
    },
    "median_home_value": {
        "year",
        "GEOID",
        "NAME",
        "Jurisdiction",
        "County",
        "estimate",
    },
    "median_smoc": {
        "year",
        "GEOID",
        "NAME",
        "Jurisdiction",
        "County",
        "variable",
        "estimate",
    },
    "commute_time": {"year", "GEOID", "NAME", "Jurisdiction", "County", "estimate"},
    "commute_habits": {
        "year",
        "GEOID",
        "NAME",
        "Jurisdiction",
        "County",
        "variable",
        "estimate",
    },
    "historic_population": {
        "geoid",
        "NAME",
        "geo_type",
        "Jurisdiction",
        "County",
        # "Year",
        "Population",
    },
}

TIMESERIES_FILTER_COLS = {
    "historic_population": {
        "Location": "NAME",
        # no year mapping for this one
    }
}


def query_timeseries(table_name: str, filters: dict | None = None):
    if table_name not in _VALID_COLS:
        raise KeyError(f"No timeseries table registered under '{table_name}'")

    # Map frontend filter labels to table columns
    mapping = TIMESERIES_FILTER_COLS.get(table_name, {})
    mapped_filters = {}

    for label, value in (filters or {}).items():
        col = mapping.get(label)
        if col is None:
            continue
        mapped_filters[col] = value

    print(
        f"query_timeseries: table_name={table_name}, filters={filters}, mapped_filters={mapped_filters}"
    )
    valid_cols = _VALID_COLS[table_name]
    where_clauses = []
    params = []

    for col, values in mapped_filters.items():
        if col not in valid_cols:
            logger.warning(
                "timeseries_db: skipping unknown filter column '%s' on table '%s'",
                col,
                table_name,
            )
            continue

        if isinstance(values, str):
            values = [values]

        placeholders = ", ".join("?" for _ in values)
        where_clauses.append(f'"{col}" IN ({placeholders})')
        params.extend(values)

    where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""
    sql = f'SELECT * FROM "{table_name}" {where_sql}'
    print(f"HISTORIC SERIES SQL: {sql}")
    print(f"PARAMS: {params}")
    return DB.execute(sql, params).df()
