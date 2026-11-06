"""
Margins of error on the variable explorer's comparison map
(query.comparison.compare_variables), run against small in-memory tidy tables
instead of the warehouse: each town's tooltip carries the margin and
reliability label of both values, and a warehouse built before margins were
collected still serves its map without them.
"""

import duckdb

from query import comparison

TOWNS = [
    ("5000100001", "ADDISON"),
    ("5000100002", "BRISTOL"),
    ("5000100003", "LINCOLN"),
]

# (geoid, value, percent, value_moe, percent_moe, value_reliability,
#  percent_reliability) per variable. Unemployment Rate is a count with its
# rate in percent, so the map shows the rate's margin; Median Age has no
# percent, so it shows the count's.
UNEMPLOYMENT = [
    ("5000100001", 40.0, 3.1, 15.0, 1.2, "medium", "medium"),
    ("5000100002", 25.0, 2.0, 20.0, 1.5, "low", "low"),
    ("5000100003", 60.0, 4.4, 18.0, 1.0, "high", "high"),
]
MEDIAN_AGE = [
    ("5000100001", 41.2, None, 2.1, None, "high", None),
    ("5000100002", 38.5, None, 3.4, None, "high", None),
    ("5000100003", 45.0, None, 6.0, None, "high", None),
]


def _db(margins: bool) -> duckdb.DuckDBPyConnection:
    con = duckdb.connect()
    con.execute("LOAD spatial")
    con.execute(
        """
        CREATE TABLE vt_town_lines_geom AS
        SELECT * FROM (VALUES
            ('5000100001', 'ADDISON', ST_AsWKB(ST_Point(0, 0))),
            ('5000100002', 'BRISTOL', ST_AsWKB(ST_Point(1, 0))),
            ('5000100003', 'LINCOLN', ST_AsWKB(ST_Point(2, 0)))
        ) AS t(FIPS_ID, TOWN_NAME, geometry)
        """
    )
    margin_columns = (
        ", value_moe DOUBLE, percent_moe DOUBLE, value_reliability VARCHAR,"
        " percent_reliability VARCHAR"
        if margins
        else ""
    )
    for table, variable, rows in [
        ("acs5_economics_tidy", "Unemployment Rate", UNEMPLOYMENT),
        ("acs5_demographics_tidy", "Median Age", MEDIAN_AGE),
    ]:
        con.execute(
            f"""
            CREATE TABLE {table} (
                year VARCHAR, geo_type VARCHAR, geoid VARCHAR, variable VARCHAR,
                value DOUBLE, percent DOUBLE{margin_columns}
            )
            """
        )
        for row in rows:
            values = ["2023", "town", row[0], variable, *row[1:3]]
            if margins:
                values += row[3:]
            con.execute(
                f"INSERT INTO {table} VALUES ({', '.join('?' * len(values))})",
                values,
            )
    return con


def _tooltips(monkeypatch, margins: bool) -> dict[str, dict]:
    monkeypatch.setattr(comparison, "DB", _db(margins))
    geojson, _legend = comparison.compare_variables(
        "economics", "town", "Unemployment Rate", "demographics", "Median Age"
    )
    return {
        f["properties"]["tooltip"]["__title__"]: f["properties"]["tooltip"]
        for f in geojson["features"]
    }


def test_tooltips_carry_each_values_margin(monkeypatch):
    bristol = _tooltips(monkeypatch, margins=True)["Bristol"]

    assert bristol["Unemployment Rate"] == 2.0
    assert bristol["__margins__"] == {
        "Unemployment Rate": {"moe": 1.5, "reliability": "low"},
        "Median Age": {"moe": 3.4, "reliability": "high"},
    }


def test_warehouse_without_margins_still_serves_its_map(monkeypatch):
    tooltips = _tooltips(monkeypatch, margins=False)

    assert tooltips["Bristol"] == {
        "__title__": "Bristol",
        "Unemployment Rate": 2.0,
        "Median Age": 38.5,
    }
    assert len(tooltips) == len(TOWNS)
