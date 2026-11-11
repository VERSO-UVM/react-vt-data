"""
The tidy ACS endpoints' query, run against a small in-memory tidy table
instead of the warehouse: Title Case fields, with each estimate's margin of
error where the warehouse has one.
"""

import importlib

import duckdb
import pytest

from query import production_db

ESTIMATES = (
    "year BIGINT, geoid VARCHAR, name VARCHAR, section VARCHAR, "
    "variable VARCHAR, value DOUBLE, percent DOUBLE"
)
MARGINS = (
    "value_moe DOUBLE, value_reliability VARCHAR, "
    "percent_moe DOUBLE, percent_reliability VARCHAR"
)
ROW = (2023, "5000144350", "Middlebury town", "Race", "Asian", 150.0, 1.8)


@pytest.fixture
def warehouse(monkeypatch):
    conn = duckdb.connect()
    monkeypatch.setattr(production_db, "get_db", lambda: conn)
    module = importlib.import_module("query.acs5")
    monkeypatch.setattr(module, "DB", conn)
    return module, conn


def test_margins_come_back_with_their_estimates(warehouse):
    acs5, conn = warehouse
    conn.execute(f"CREATE TABLE acs5_demographics_tidy ({ESTIMATES}, {MARGINS})")
    conn.execute(
        "INSERT INTO acs5_demographics_tidy VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [*ROW, 80.0, "low", 1.0, "low"],
    )
    df = acs5.get_acs5_tidy("demographics", {"Location": "Middlebury town"})

    assert df.to_dict("records") == [
        {
            "year": 2023,
            "Section": "Race",
            "Variable": "Asian",
            "Value": 150.0,
            "Value_MOE": 80.0,
            "Value_Reliability": "low",
            "Percent": 1.8,
            "Percent_MOE": 1.0,
            "Percent_Reliability": "low",
        }
    ]


def test_warehouse_without_margins_still_serves_its_estimates(warehouse):
    # Built before margins were collected: the endpoints must not fail on the
    # missing columns while the ETL catches up.
    acs5, conn = warehouse
    conn.execute(f"CREATE TABLE acs5_demographics_tidy ({ESTIMATES})")
    conn.execute(
        "INSERT INTO acs5_demographics_tidy VALUES (?, ?, ?, ?, ?, ?, ?)", list(ROW)
    )
    df = acs5.get_acs5_tidy("demographics", {"Location": "Middlebury town"})

    assert list(df.columns) == ["year", "Section", "Variable", "Value", "Percent"]
    assert df.iloc[0].Value == 150.0
