"""
Queries for the Statewide County Comparison page: one value per Vermont
county, plus Vermont and the United States, per year, for a single Census
Data Profile measure. The indicators themselves are defined in
`query/county_comparison_indicators.py`.
"""

from pathlib import Path

from query.county_comparison_indicators import Indicator
from query.sql_render import _placeholder, filter_clauses, render_sql

SQL_DIR = Path(__file__).resolve().parent / "sql" / "acs5"
SQL_PATH = SQL_DIR / "acs5_dp_county_comparison.sql"
# kind="density" indicators: population ÷ land area, joined in SQL.
DENSITY_SQL_PATH = SQL_DIR / "acs5_dp_county_density.sql"
SOURCE_TABLE = "acs5_dp_combined_tidy"
LAND_TABLE = "land_area"

# Geographies the comparison shows: the 14 counties plus two benchmarks.
GEO_TYPES = ("county", "state", "national")


def comparison_query(indicator: Indicator, margins: bool = False) -> tuple[str, list]:
    """Render the comparison query for one indicator; returns (sql, params).

    Rows are {place, geo_type, year, value}, where `place` is the short display
    name ("Essex", "Vermont", "United States"), plus value_MOE and
    value_Reliability when `margins` (the table has them). Values travel as $N
    placeholders: execute with `DB.execute(sql, params)`.
    """
    params: list = []
    clauses = filter_clauses(
        {
            "table": [indicator.table],
            "measure": list(indicator.measures),
            "geo_type": list(GEO_TYPES),
        },
        params,
    )
    clauses.append(f"category LIKE {_placeholder(indicator.category, params)}")
    paths = " OR ".join(
        f"(subcategory = {_placeholder(sub, params)}"
        f" AND variable = {_placeholder(var, params)})"
        for sub, var in indicator.paths
    )
    clauses.append(f"({paths})")
    # Census marks unavailable values with negative sentinels; drop them along
    # with nulls, as query/acs5.py does.
    clauses.append("value >= 0")
    where_string = "WHERE " + "\n    AND ".join(clauses)
    if indicator.kind == "density":
        # Same population filter, then divided by land area. Land area has no
        # margin, so neither does the result.
        sql = render_sql(
            DENSITY_SQL_PATH,
            table=SOURCE_TABLE,
            land_table=LAND_TABLE,
            where_string=where_string,
        )
        return sql, params
    sql = render_sql(
        SQL_PATH, table=SOURCE_TABLE, where_string=where_string, margins=margins
    )
    return sql, params
