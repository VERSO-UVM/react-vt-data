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
        "year", "GEOID", "NAME", "Jurisdiction", "County", "Unemployment_Rate"
    },
    "median_earnings": {
        "year", "GEOID", "NAME", "Jurisdiction", "County", "variable", "estimate"
    },
    "median_home_value": {
        "year", "GEOID", "NAME", "Jurisdiction", "County", "estimate"
    },
    "median_smoc": {
        "year", "GEOID", "NAME", "Jurisdiction", "County", "variable", "estimate"
    },
    "commute_time": {
        "year", "GEOID", "NAME", "Jurisdiction", "County", "estimate"
    },
    "commute_habits": {
        "year", "GEOID", "NAME", "Jurisdiction", "County", "variable", "estimate"
    },
    "historic_population": {
        "X_geoid", "NAME", "Jurisdiction", "County", "Year", "Population"
    },
}


def query_timeseries(table_name: str, filters: dict | None = None):
    """
    Query a timeseries table with optional column-value filters.

    Filters are applied as WHERE col IN (...) clauses. Unknown columns are
    silently ignored (safe against injection via whitelist).

    Returns a pandas DataFrame.
    """
    if table_name not in _VALID_COLS:
        raise KeyError(f"No timeseries table registered under '{table_name}'")

    valid_cols = _VALID_COLS[table_name]
    where_clauses: list[str] = []
    params: list = []

    if filters:
        for col, values in filters.items():
            if col not in valid_cols:
                logger.warning(
                    "timeseries_db: skipping unknown filter column '%s' on table '%s'",
                    col,
                    table_name,
                )
                continue
            if isinstance(values, str):
                values = [values]
            placeholders = ", ".join(["?" for _ in values])
            where_clauses.append(f'"{col}" IN ({placeholders})')
            params.extend(values)

    where_sql = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""
    sql = f'SELECT * FROM "{table_name}" {where_sql}'
    return DB.execute(sql, params).df()
