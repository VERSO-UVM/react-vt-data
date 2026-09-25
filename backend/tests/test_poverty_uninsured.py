"""
Tests for the poverty / uninsured trend series behind the Community Health
report's "change over time" panel, run against a small in-memory DP03 table
instead of the warehouse.
"""

import importlib

import duckdb
import pytest

from query import production_db

POVERTY = "PERCENTAGE OF FAMILIES AND PEOPLE WHOSE INCOME IN THE PAST 12 MONTHS IS BELOW THE POVERTY LEVEL"
INSURANCE = "HEALTH INSURANCE COVERAGE"
CNI = "Civilian noninstitutionalized population"


@pytest.fixture
def acs5(monkeypatch):
    conn = duckdb.connect()
    conn.execute(
        """
        CREATE TABLE dp_economic (
            year BIGINT, name VARCHAR, category VARCHAR, subcategory VARCHAR,
            variable VARCHAR, measure VARCHAR, value VARCHAR
        )
        """
    )
    addison = "Addison County, Vermont"
    rows = [
        (2016, addison, POVERTY, "All people", "Total", "Percent", "8.7"),
        # 2017-2018 label the percent "Percent Estimate".
        (2017, addison, POVERTY, "All people", "Total", "Percent Estimate", "7.8"),
        (2016, addison, INSURANCE, CNI, "No health insurance coverage", "Percent", "5.2"),
        # The count row for the same selection is not a rate.
        (2016, addison, INSURANCE, CNI, "No health insurance coverage", "Estimate", "1900"),
        # A sentinel is missing data, not a value.
        (2017, addison, INSURANCE, CNI, "No health insurance coverage", "Percent", "-888888888"),
        # Same labels under another category must not leak in.
        (2016, addison, "EMPLOYMENT STATUS", "All people", "Total", "Percent", "99"),
        (2016, "Vermont", POVERTY, "All people", "Total", "Percent", "11.6"),
    ]  # fmt: skip
    conn.executemany("INSERT INTO dp_economic VALUES (?, ?, ?, ?, ?, ?, ?)", rows)

    monkeypatch.setattr(production_db, "get_db", lambda: conn)
    module = importlib.import_module("query.acs5")
    monkeypatch.setattr(module, "DB", conn)
    return module


def series(acs5, names):
    df = acs5.get_poverty_uninsured_timeseries(names)
    return {
        (r.Location, r.Variable, r.year): r.Percent for r in df.itertuples(index=False)
    }


def test_rates_for_one_place_across_measure_spellings(acs5):
    assert series(acs5, ["Addison County, Vermont"]) == {
        ("Addison County, Vermont", "Below poverty level", 2016): 8.7,
        ("Addison County, Vermont", "Below poverty level", 2017): 7.8,
        ("Addison County, Vermont", "No health insurance", 2016): 5.2,
    }


def test_filters_to_the_requested_places(acs5):
    got = series(acs5, ["Vermont"])
    assert got == {("Vermont", "Below poverty level", 2016): 11.6}


def test_no_places_means_no_rows(acs5):
    assert series(acs5, []) == {}
