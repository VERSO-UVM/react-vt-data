"""
DuckDB-backed access to the census time-series CSV files.

Each CSV is registered as a view that:
  - Casts the year column to VARCHAR (matching the behaviour of split_name_col)
  - Adds Jurisdiction and County columns derived from NAME via regex
    (replicating split_name_col's regex: r"^(.*?),\s*(.*?) County,")

Use query_timeseries(view_name, filters) to filter any registered view.
"""

import logging
from pathlib import Path

import duckdb

logger = logging.getLogger(__name__)

_DATADIR = Path(__file__).resolve().parent.parent / "Data" / "Census"

DB = duckdb.connect()

# ---------------------------------------------------------------------------
# Name-parsing SQL snippet (replicates split_name_col regex)
# ---------------------------------------------------------------------------
_NAME_COLS = """
    regexp_extract(NAME, '^(.*?),', 1)           AS "Jurisdiction",
    regexp_extract(NAME, ',\\s*(.*?) County,', 1) AS "County"
"""


def _csv(filename: str) -> str:
    return str(_DATADIR / filename)


# ---------------------------------------------------------------------------
# View definitions
# ---------------------------------------------------------------------------
_VIEWS: dict[str, tuple[str, set[str]]] = {}
"""Maps view_name -> (CREATE VIEW sql, set of queryable column names)"""


def _register(view_name: str, sql: str, cols: set[str]) -> None:
    DB.execute(sql)
    _VIEWS[view_name] = cols
    logger.debug("Registered timeseries_db view: %s", view_name)


_register(
    "unemployment_rate",
    f"""
    CREATE VIEW unemployment_rate AS
    SELECT
        CAST(year AS VARCHAR) AS year,
        GEOID,
        NAME,
        {_NAME_COLS},
        TRY_CAST(Unemployment_Rate AS DOUBLE) AS Unemployment_Rate
    FROM read_csv_auto('{_csv("unemployment_rate_by_year.csv")}')
    """,
    {"year", "GEOID", "NAME", "Jurisdiction", "County", "Unemployment_Rate"},
)

_register(
    "median_earnings",
    f"""
    CREATE VIEW median_earnings AS
    SELECT
        CAST(year AS VARCHAR) AS year,
        GEOID,
        NAME,
        {_NAME_COLS},
        variable,
        TRY_CAST(estimate AS DOUBLE) AS estimate
    FROM read_csv_auto('{_csv("median_earnings_by_year.csv")}')
    """,
    {"year", "GEOID", "NAME", "Jurisdiction", "County", "variable", "estimate"},
)

_register(
    "median_home_value",
    f"""
    CREATE VIEW median_home_value AS
    SELECT
        CAST(year AS VARCHAR) AS year,
        GEOID,
        NAME,
        {_NAME_COLS},
        TRY_CAST(estimate AS DOUBLE) AS estimate
    FROM read_csv_auto('{_csv("med_home_value_by_year.csv")}')
    """,
    {"year", "GEOID", "NAME", "Jurisdiction", "County", "estimate"},
)

_register(
    "median_smoc",
    f"""
    CREATE VIEW median_smoc AS
    SELECT
        CAST(year AS VARCHAR) AS year,
        GEOID,
        NAME,
        {_NAME_COLS},
        variable,
        TRY_CAST(estimate AS DOUBLE) AS estimate
    FROM read_csv_auto('{_csv("med_smoc_by_year.csv")}')
    """,
    {"year", "GEOID", "NAME", "Jurisdiction", "County", "variable", "estimate"},
)

_register(
    "commute_time",
    f"""
    CREATE VIEW commute_time AS
    SELECT
        CAST(year AS VARCHAR) AS year,
        GEOID,
        NAME,
        {_NAME_COLS},
        TRY_CAST(estimate AS DOUBLE) AS estimate
    FROM read_csv_auto('{_csv("commute_time_by_year.csv")}')
    """,
    {"year", "GEOID", "NAME", "Jurisdiction", "County", "estimate"},
)

_register(
    "commute_habits",
    f"""
    CREATE VIEW commute_habits AS
    SELECT
        CAST(year AS VARCHAR) AS year,
        GEOID,
        NAME,
        {_NAME_COLS},
        variable,
        TRY_CAST(estimate AS DOUBLE) AS estimate
    FROM read_csv_auto('{_csv("commute_habits_by_year.csv")}')
    """,
    {"year", "GEOID", "NAME", "Jurisdiction", "County", "variable", "estimate"},
)

_register(
    "historic_population",
    f"""
    CREATE VIEW historic_population AS
    SELECT
        X_geoid,
        NAME,
        {_NAME_COLS},
        CAST("Year" AS VARCHAR) AS "Year",
        TRY_CAST(Population AS DOUBLE) AS Population
    FROM read_csv_auto('{_csv("VT_Historic_Population.csv")}')
    """,
    {"X_geoid", "NAME", "Jurisdiction", "County", "Year", "Population"},
)


# ---------------------------------------------------------------------------
# Query helper
# ---------------------------------------------------------------------------
def query_timeseries(view_name: str, filters: dict | None = None):
    """
    Query a registered timeseries view with optional column-value filters.

    Filters are applied as WHERE col IN (...) clauses. Unknown columns are
    silently ignored (safe against injection via whitelist).

    Returns a pandas DataFrame.
    """
    if view_name not in _VIEWS:
        raise KeyError(f"No timeseries view registered under '{view_name}'")

    valid_cols = _VIEWS[view_name]
    where_clauses: list[str] = []
    params: list = []

    if filters:
        for col, values in filters.items():
            if col not in valid_cols:
                logger.warning(
                    "timeseries_db: skipping unknown filter column '%s' on view '%s'",
                    col,
                    view_name,
                )
                continue
            if isinstance(values, str):
                values = [values]
            placeholders = ", ".join(["?" for _ in values])
            where_clauses.append(f'"{col}" IN ({placeholders})')
            params.extend(values)

    where_sql = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""
    sql = f'SELECT * FROM "{view_name}" {where_sql}'
    return DB.execute(sql, params).df()
