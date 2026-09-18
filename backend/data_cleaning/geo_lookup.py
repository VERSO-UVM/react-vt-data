"""
**Description**:
    Shared GEOID / town / county lookups for the cleaning scripts, built from the
    `lake.RAW.vt_town_lines` table.

    Registers two table views:
    1. geo_town_lookup   -> geoid, town, county_fips, county, town_key
    2. geo_county_lookup -> county_fips, county

    Geographic Column Standards:

    - `town` is the Census-style "{town_name} town/city/gore/grant" form.
    - `county` is the short title-case name ("Addison", "Grand Isle").
    - `town_key` is the ALL-CAPS name normalized to town names.
    (suffix dropped unless it disambiguates), for datasets with no GEOID.

    Also holds the other helper functions every cleaner shares:
    - `write_table` Adds table to the lake.CLEANED schema
    - `acs_geo_sql` (geo_type / geoid / county_fips / county for raw ACS-5 rows).
"""

import duckdb
import pandas as pd

# Census-designated "estimate not available" sentinel
UNAVAILABLE = -666666666.0


def load_initcap(con: duckdb.DuckDBPyConnection):
    """
    Manual creation of the `INITCAP` keyword (Not available in DuckDB)
    This function converts a string into (Title Case)

    Args:
        con: DuckDBPyConnection to the DuckLake

    """
    con.execute(
        """--sql
        CREATE OR REPLACE MACRO initcap(str) AS
        list_reduce(
            [upper(x[1]) || lower(x[2:]) for x in string_split(str, ' ')],
            (x, y) -> x || ' ' || y
        );
        """
    )


def write_table(
    con: duckdb.DuckDBPyConnection, name: str, source: str | pd.DataFrame
) -> None:
    """
    Write `lake.CLEANED.{name}` from a SELECT query or a DataFrame.

    Args:
        con: DuckDBPyConnection to the DuckLake
        name: table name to write to the CLEANED schema
        source: Either a pandas DataFrame object or string name of a registered table
    """
    if isinstance(source, str):
        con.execute(f"CREATE OR REPLACE TABLE lake.CLEANED.{name} AS {source}")
        return

    con.register("_clean_src", source)
    try:
        con.execute(
            f"CREATE OR REPLACE TABLE lake.CLEANED.{name} AS SELECT * FROM _clean_src"
        )
    finally:
        con.unregister("_clean_src")


def acs_geo_sql(base: str) -> str:
    """
    Wrap a raw ACS-5 SELECT with standardized geography columns.

    `base` must expose the raw columns NAME, geo_type, state and county
    (3-digit county code); Those columns are replaced by:

    Requires :func:`geo_lookup.build_geo_lookups` to have been called on the connection.
    """
    return f"""--sql
        WITH n AS (
            SELECT
                r.*,
                CASE
                    WHEN r.geo_type = 'county_subdivision' THEN 'town'
                    ELSE r.geo_type
                END AS gt
            FROM ({base}) AS r
        ),
        g AS (
            SELECT
                COLUMNS(
                    c -> LOWER(c) NOT IN (
                        'name', 'geo_type', 'state', 'county', 'county_1', 'gt'
                    )
                ),
                n.NAME AS name,
                n.gt AS geo_type,
                CASE n.gt
                    WHEN 'town' THEN CAST(t.GEOID AS VARCHAR)
                    WHEN 'county' THEN CONCAT(n.state, n.county)
                    WHEN 'state' THEN '50'
                END AS geoid,
                CASE
                    WHEN n.gt IN ('county', 'town') THEN CONCAT(n.state, n.county)
                END AS county_fips,
            FROM n
            LEFT JOIN (
                SELECT DISTINCT GEOID, NAME FROM lake.RAW.vt_town_lines
            ) AS t
                ON n.NAME = t.NAME
        )
        SELECT g.*, c.county
        FROM g
        LEFT JOIN geo_county_lookup AS c
            ON g.county_fips = c.county_fips
        """


def geoid_sql(expr: str) -> str:
    """
    SQL that normalizes a raw GEOID-ish column to a VARCHAR of digits.

    Strips Census prefixes such as '0600000US' and float artifacts such as
    '5000100715.0'; empty results become NULL.

    Args:
        expr: Typically the column name of the geoid-type column to cast.

    Returns:
        str: Casting SQL NULLIF line.
    """
    return (
        f"NULLIF(regexp_extract(CAST({expr} AS VARCHAR), "
        r"'(\d+)(?:\.0+)?$', 1), '')"
    )


def lowercase_cols(cols: list[str], renames: dict[str, str] | None = None) -> str:
    """
    `Col AS col` select list; `renames` overrides individual aliases.

    Args:
        cols: List of column names in which to perform lowercase operation on
        renames: Dictionary of paired strings

    Returns:
        str:
    """
    renames = renames or {}
    return ", ".join(f'"{c}" AS {renames.get(c, c.lower())}' for c in cols)


def build_geo_lookups(con: duckdb.DuckDBPyConnection) -> None:
    con.execute(
        r"""--sql
        CREATE OR REPLACE TEMP VIEW geo_town_lookup AS
        WITH parsed AS (
            SELECT DISTINCT
                CAST(GEOID AS VARCHAR) AS geoid,
                NAME,
                regexp_extract(NAME, '^(.*?)\s+(town|city|gore|grant),', 1) AS base,
                regexp_extract(NAME, '^(.*?)\s+(town|city|gore|grant),', 2) AS suffix
            FROM lake.RAW.vt_town_lines
        ),
        counted AS (
            SELECT *, COUNT(*) OVER (PARTITION BY base) AS base_count
            FROM parsed
        ),
        keyed AS (
            SELECT
                geoid,
                TRIM(SPLIT_PART(NAME, ',', 1)) AS town,
                LEFT(geoid, 5) AS county_fips,
                REPLACE(TRIM(SPLIT_PART(NAME, ',', 2)), ' County', '') AS county,
                REPLACE(
                    REPLACE(
                        UPPER(
                            CASE
                                WHEN suffix IN ('gore', 'grant') OR base_count > 1
                                    THEN base || ' ' || suffix
                                ELSE base
                            END
                        ),
                        'ST.', 'SAINT'
                    ),
                    '''', ''
                ) AS town_key
            FROM counted
        )
        SELECT
            geoid,
            town,
            county_fips,
            county,
            CASE WHEN town_key = 'WARRENS GORE' THEN 'WARREN GORE' ELSE town_key END
                AS town_key
        FROM keyed
        """
    )
    con.execute(
        """--sql
        CREATE OR REPLACE TEMP VIEW geo_county_lookup AS
        SELECT DISTINCT county_fips, county
        FROM geo_town_lookup
        """
    )
