"""
**Description**:
    Shared GEOID / town / county lookups for the cleaning scripts, built from
    the canonical Census/VCGI town crosswalk `lake.RAW.vt_town_lines` (the
    same source `clean_fips.py` and `clean_parcels.py` use).

    Registers two temp views on the connection:

    geo_town_lookup   -> geoid, town, county_fips, county, town_key
    geo_county_lookup -> county_fips, county

    `town` is the Census-style "{name} town/city/gore/grant" form and
    `county` is the short title-case name ("Addison", "Grand Isle").
    `town_key` is the ALL-CAPS name normalized to match free-text town names
    (suffix dropped unless it disambiguates), for datasets with no GEOID.
"""

import duckdb


def geoid_sql(expr: str) -> str:
    """
    SQL that normalizes a raw GEOID-ish column to a VARCHAR of digits.

    Strips Census prefixes such as '0600000US' and float artifacts such as
    '5000100715.0'; empty results become NULL.
    """
    return (
        f"NULLIF(regexp_extract(CAST({expr} AS VARCHAR), "
        r"'(\d+)(?:\.0+)?$', 1), '')"
    )


def lowercase_cols(cols: list[str], renames: dict[str, str] | None = None) -> str:
    """`Col AS col` select list; `renames` overrides individual aliases."""
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
