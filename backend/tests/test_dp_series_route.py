"""
Tests for POST /load/acs5-db/dp-combined/series, run against a small in-memory
acs5_dp_combined_tidy instead of the warehouse.

Burlington's 2011-2012 median monthly owner costs with and without a mortgage
share one Category/Subcategory/Variable/Measure path (issue #106). The route
returns every row, in the same order each year, so the chart can draw each as
its own line; with the pipeline's variable_code and source_label columns it
also returns those, so the lines can be named.
"""

import duckdb
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.routes.post_routes import post_acs5_db

BURLINGTON = "Burlington city, Chittenden County, Vermont"
SMOC = "SELECTED MONTHLY OWNER COSTS (SMOC)"
LABEL = "Estimate!!SELECTED MONTHLY OWNER COSTS (SMOC)!!{}!!Median (dollars)"

# (year, variable_code, source_label part, value), inserted non-mortgage
# first so order by code differs from insertion order.
ROWS = [
    (2011, "DP04_0107E", "Housing units without a mortgage", "699"),
    (2011, "DP04_0100E", "Housing units with a mortgage", "1731"),
    (2012, "DP04_0107E", "Housing units without a mortgage", "737"),
    (2012, "DP04_0100E", "Housing units with a mortgage", "1764"),
]

REQUEST = {
    "name": BURLINGTON,
    "table": "DP04",
    "category": SMOC,
    "subcategory": "Median (dollars)",
    "variable": "Total",
    "measure": "Estimate",
    "year_min": 2009,
    "year_max": 2024,
}


def _client(monkeypatch, with_identity: bool) -> TestClient:
    conn = duckdb.connect()
    identity = ", variable_code VARCHAR, source_label VARCHAR" if with_identity else ""
    conn.execute(
        f"""
        CREATE TABLE acs5_dp_combined_tidy (
            year BIGINT, name VARCHAR, "table" VARCHAR, category VARCHAR,
            subcategory VARCHAR, variable VARCHAR, measure VARCHAR,
            value VARCHAR{identity}
        )
        """
    )
    for year, code, part, value in ROWS:
        base = [year, BURLINGTON, "DP04", SMOC, "Median (dollars)", "Total"]
        base += ["Estimate", value]
        if with_identity:
            base += [code, LABEL.format(part)]
        conn.execute(
            f"INSERT INTO acs5_dp_combined_tidy VALUES ({', '.join('?' * len(base))})",
            base,
        )
    monkeypatch.setattr(post_acs5_db, "DB", conn)
    app = FastAPI()
    app.include_router(post_acs5_db.router)
    return TestClient(app)


@pytest.mark.parametrize("with_identity", [True, False])
def test_returns_every_row_for_a_shared_label_path(monkeypatch, with_identity):
    rows = _client(monkeypatch, with_identity).post(
        "/load/acs5-db/dp-combined/series", json=REQUEST
    )
    values = sorted((r["year"], r["Value"]) for r in rows.json()["data"])
    assert values == [(2011, 699), (2011, 1731), (2012, 737), (2012, 1764)]


def test_identity_columns_name_rows_and_order_them_by_code(monkeypatch):
    data = (
        _client(monkeypatch, with_identity=True)
        .post("/load/acs5-db/dp-combined/series", json=REQUEST)
        .json()["data"]
    )
    assert [(r["year"], r["variable_code"]) for r in data] == [
        (2011, "DP04_0100E"),
        (2011, "DP04_0107E"),
        (2012, "DP04_0100E"),
        (2012, "DP04_0107E"),
    ]
    assert "with a mortgage" in data[0]["source_label"]


def test_rows_are_named_where_labels_repeat(monkeypatch):
    # Real 2011-2012 Census labels are identical for these two codes, so the
    # names come from query/dp_variable_names.csv.
    data = (
        _client(monkeypatch, with_identity=True)
        .post("/load/acs5-db/dp-combined/series", json=REQUEST)
        .json()["data"]
    )
    assert [(r["variable_code"], r["variable_name"]) for r in data[:2]] == [
        ("DP04_0100E", "With a mortgage"),
        ("DP04_0107E", "Without a mortgage"),
    ]


def test_unnamed_rows_serialize_with_a_null_name(monkeypatch):
    # 2013 isn't in the names table, so its rows get a JSON null name.
    request = {**REQUEST, "year_min": 2013, "year_max": 2013}
    client = _client(monkeypatch, with_identity=True)
    post_acs5_db.DB.execute(
        "INSERT INTO acs5_dp_combined_tidy VALUES "
        "(2013, ?, 'DP04', ?, 'Median (dollars)', 'Total', 'Estimate', '1832', "
        "'DP04_0100E', 'Estimate!!SMOC!!Housing units with a mortgage')",
        [BURLINGTON, SMOC],
    )
    data = client.post("/load/acs5-db/dp-combined/series", json=request).json()
    assert data["data"][0]["variable_name"] is None


def test_without_identity_columns_rows_keep_load_order(monkeypatch):
    data = (
        _client(monkeypatch, with_identity=False)
        .post("/load/acs5-db/dp-combined/series", json=REQUEST)
        .json()["data"]
    )
    assert "variable_code" not in data[0]
    # Same position each year, so the chart's nth line stays one observation.
    assert [r["Value"] for r in data] == [699, 1731, 737, 1764]
