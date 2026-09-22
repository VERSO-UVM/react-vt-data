"""
**Author**:
    Ian Sargent
**Created**:
    2026-07-13
**Description**:
    Data cleaning script for the raw `historic_population` table in the
    DuckLake (decennial census town populations).

    Produces two long-format timeseries tables:

    - Population by town, with county and state aggregations appended.
    - Decade-over-decade percent change for each geography:
      (Population_t - Population_t-1) / Population_t-1 * 100
      (each geography's first census year is dropped).

    Town names come from `lake.RAW.vt_town_lines`; county_fips is the first
    five digits of the (FIPS-derived) geoid.
**Run with**:
python run_data_cleaning.py clean_historic_population
"""

import re

import duckdb

from data_cleaning.geo_lookup import write_table

POPULATION_TABLE = "VCGI_historicPopulation_timeseries"
PCT_CHANGE_TABLE = "VCGI_historicPopulation_pctChange_timeseries"


def population_sql(con: duckdb.DuckDBPyConnection) -> str:
    """
    Town rows melted to long format, plus county and state sum aggregations.

    Args:
        con: DuckDBPyConnection to the DuckLake

    Returns:
        str: SQL query creating the historic population table
    """
    # Year columns are the raw columns that contain a digit (e.g. "year1790")
    raw_cols = con.execute("DESCRIBE lake.RAW.historic_population").df()["column_name"]
    year_cols = ", ".join(f'"{c}"' for c in raw_cols if re.search(r"\d", c))

    return f"""--sql
        WITH melted AS (
            SELECT
                LPAD(CAST(_GEOID AS VARCHAR), 10, '0') AS geoid,
                county,
                CAST(REGEXP_REPLACE(LOWER(year_col), '^year', '') AS INTEGER) AS year,
                Population
            FROM (
                UNPIVOT lake.RAW.historic_population
                ON {year_cols}
                INTO NAME year_col VALUE Population
            )
        ),
        town AS (
            SELECT
                l.year,
                t.NAME AS name,
                l.geoid,
                LEFT(l.geoid, 5) AS county_fips,
                l.county,
                l.Population,
                'town' AS geo_type
            FROM melted AS l
            LEFT JOIN (
                SELECT DISTINCT GEOID, NAME FROM lake.RAW.vt_town_lines
            ) AS t
                ON l.geoid = LPAD(CAST(t.GEOID AS VARCHAR), 10, '0')
        )
        SELECT * FROM town
        UNION ALL
        
        SELECT
            year,
            MODE(county) || ' County, Vermont',
            county_fips,
            county_fips,
            MODE(county),
            SUM(Population),
            'county'
        FROM town
        GROUP BY year, county_fips
        UNION ALL
        SELECT
            year,
            'Vermont',
            '50',
            CAST(NULL AS VARCHAR),
            CAST(NULL AS VARCHAR),
            SUM(Population),
            'state'
        FROM town
        GROUP BY year
        """


def pct_change_sql() -> str:
    """
    Town rows melted to long format, plus county and state sum aggregations.

    Args:
        con: DuckDBPyConnection to the DuckLake

    Returns:
        str: SQL query creating the historic population change table
    """
    return f"""--sql
        SELECT
            year,
            name,
            geoid,
            county_fips,
            county,
            Population,
            Pct_Population_Change,
            geo_type
        FROM (
            SELECT
                *,
                ROUND(
                    (
                        CAST(Population AS DOUBLE)
                        / NULLIF(
                            LAG(CAST(Population AS DOUBLE)) OVER (
                                PARTITION BY geoid ORDER BY year
                            ),
                            0
                        )
                        - 1
                    ) * 100,
                    1
                ) AS Pct_Population_Change
            FROM lake.CLEANED.{POPULATION_TABLE}
        )
        WHERE Pct_Population_Change IS NOT NULL
        """


def main(con: duckdb.DuckDBPyConnection):
    write_table(con, POPULATION_TABLE, population_sql(con))
    write_table(con, PCT_CHANGE_TABLE, pct_change_sql())
