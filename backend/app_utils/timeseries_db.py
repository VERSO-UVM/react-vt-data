"""
DuckDB-backed access to the census time-series tables in Data/_Processed/acs5/.

Use query_timeseries(table_name, filters) to filter any registered table.
"""

import logging

from query.production_db import DB

logger = logging.getLogger(__name__)

# Per-table registry. "select"/"where" default to the whole table; the two
# entries that override them reproduce the column names and town-level row set
# these endpoints have always returned (build/acs5.py renames the measure to
# Value and appends county/state rollups for the /load/acs5-db routes).
# "cols" whitelists what a caller may filter on, which guards against injection.
_TABLES: dict[str, dict] = {
    "unemployment_rate": {
        "table": "acs5_unemployment_rate",
        "select": 'year, GEOID, NAME, Jurisdiction, County, "Value" AS Unemployment_Rate',
        "where": "geotype = 'county_subdivision'",
        "cols": {
            "year",
            "GEOID",
            "NAME",
            "Jurisdiction",
            "County",
            "Unemployment_Rate",
        },
    },
    "median_earnings": {
        "table": "acs5_median_earnings",
        "select": "year, GEOID, NAME, Jurisdiction, County, "
        '"Variable" AS variable, "Value" AS estimate',
        "where": "geotype = 'county_subdivision'",
        "cols": {
            "year",
            "GEOID",
            "NAME",
            "Jurisdiction",
            "County",
            "variable",
            "estimate",
        },
    },
    "median_home_value": {
        "table": "acs5_median_home_value",
        "cols": {
            "year",
            "GEOID",
            "NAME",
            "Jurisdiction",
            "County",
            "estimate",
        },
    },
    "median_smoc": {
        "table": "acs5_median_smoc",
        "cols": {
            "year",
            "GEOID",
            "NAME",
            "Jurisdiction",
            "County",
            "variable",
            "estimate",
        },
    },
    "commute_time": {
        "table": "acs5_commute_time",
        "cols": {"year", "GEOID", "NAME", "Jurisdiction", "County", "estimate"},
    },
    "commute_habits": {
        "table": "acs5_commute_habits",
        "cols": {
            "year",
            "GEOID",
            "NAME",
            "Jurisdiction",
            "County",
            "variable",
            "estimate",
        },
    },
    "historic_population": {
        "table": "acs5_historic_population",
        "cols": {
            "geoid",
            "NAME",
            "geo_type",
            "Jurisdiction",
            "County",
            # "Year",
            "Population",
        },
    },
}

# Frontend filter labels whose name differs from the column they filter on.
# Anything else is taken as the column name itself and checked against "cols".
_LABEL_ALIASES = {"Location": "NAME"}


def query_timeseries(table_name: str, filters: dict | None = None):
    if table_name not in _TABLES:
        raise KeyError(f"No timeseries table registered under '{table_name}'")

    spec = _TABLES[table_name]
    valid_cols = spec["cols"]
    where_clauses = [spec["where"]] if spec.get("where") else []
    params = []

    for label, values in (filters or {}).items():
        col = _LABEL_ALIASES.get(label, label)
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
    sql = f'SELECT {spec.get("select", "*")} FROM "{spec["table"]}" {where_sql}'
    return DB.execute(sql, params).df()
