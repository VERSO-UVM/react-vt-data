"""
Tests for clean_zoning's shared text normalization, run against an in-memory
lake instead of the DuckLake.
"""

import duckdb

from data_cleaning.clean_zoning import build_full, read_raw_data
from data_cleaning.geo_lookup import build_geo_lookups, load_initcap

GEOMETRY = b"\x01\x01\x00\x00\x00" + bytes(16)


def _lake_with_raw_zoning() -> duckdb.DuckDBPyConnection:
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
    con.execute(
        """
        CREATE TABLE lake.RAW.zoning (
            OBJECT_ID BIGINT, GEO_ID VARCHAR, Municipal_Name VARCHAR,
            County VARCHAR, District_Name VARCHAR, geometry BLOB
        )
        """
    )
    con.execute(
        "INSERT INTO lake.RAW.zoning VALUES "
        "(1, '5000710675', 'Burlington City ', 'Chittenden ', ' Downtown ', ?), "
        "(2, NULL, 'Nowhere Gore ', 'Essex', 'Rural  ', ?)",
        [GEOMETRY, GEOMETRY],
    )
    load_initcap(con)
    build_geo_lookups(con)
    return con


def test_wide_text_is_trimmed_like_info():
    con = _lake_with_raw_zoning()
    raw_df = read_raw_data(con)
    build_full(con, raw_df)

    rows = con.execute(
        "SELECT object_id, town, county, district_name FROM wide ORDER BY 1"
    ).fetchall()
    assert rows[0][2:] == ("Chittenden", "Downtown")
    # No lookup match, so town falls back to the (now trimmed) source name.
    assert rows[1][1:] == ("Nowhere Gore", "Essex", "Rural")
    assert con.execute(
        "SELECT count(*) FROM wide WHERE district_name = 'Downtown'"
    ).fetchone() == (1,)


def test_trimming_leaves_geometry_bytes_untouched():
    con = _lake_with_raw_zoning()
    raw_df = read_raw_data(con)
    assert all(bytes(g) == GEOMETRY for g in raw_df["geometry"])
