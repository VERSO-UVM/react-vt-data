"""
Tests for the shared ACS geography standardization in geo_lookup, run against
an in-memory lake instead of the DuckLake.
"""

import duckdb

from data_cleaning.geo_lookup import acs_geo_sql, build_geo_lookups


def test_acs_geo_sql_adds_standard_identifiers():
    con = duckdb.connect()
    con.execute("ATTACH ':memory:' AS lake")
    con.execute("CREATE SCHEMA lake.RAW")
    con.execute(
        """
        CREATE TABLE lake.RAW.vt_town_lines AS
        SELECT 5000710675 AS GEOID,
            'Burlington city, Chittenden County, Vermont' AS NAME
        """
    )
    build_geo_lookups(con)
    base = """
        SELECT * FROM (VALUES
            (2020, 'Vermont', 'state', '50', NULL, 1.0),
            (2020, 'Chittenden County, Vermont', 'county', '50', '007', 2.0),
            (2020, 'Burlington city, Chittenden County, Vermont',
                'county_subdivision', '50', '007', 3.0)
        ) AS t(year, NAME, geo_type, state, county, x)
    """

    rows = con.execute(
        f"SELECT geo_type, geoid, county_fips, x FROM ({acs_geo_sql(base)}) ORDER BY x"
    ).fetchall()

    assert rows == [
        ("state", "50", None, 1.0),
        ("county", "50007", "50007", 2.0),
        ("town", "5000710675", "50007", 3.0),
    ]
