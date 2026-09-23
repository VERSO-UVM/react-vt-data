"""
Tests for the Community Health report's CDC PLACES query, run against a small
in-memory table instead of the warehouse.

CDC publishes PLACES estimates per county but not for Vermont as a whole. A
statewide pick used to return every county's rows unlabeled, so the report
showed whichever county came first as "Vermont".
"""

import importlib

import duckdb
import pandas as pd
import pytest

from api.core_functions import request_to_source
from api.models import FilterRequest
from query import production_db

SMOKING = "Current cigarette smoking among adults"
DEPRESSION = "Depression among adults"

# (county, adults as CDC stores them, smoking %)
COUNTIES = [
    ("Addison", "30,000", 10.0),
    ("Chittenden", "150,000", 9.0),
    ("Essex", "5,000", 17.0),
]


@pytest.fixture
def cdc(monkeypatch):
    conn = duckdb.connect()
    conn.execute(
        """
        CREATE TABLE cdc_places_county (
            year BIGINT, category VARCHAR, measure VARCHAR,
            data_value DOUBLE, data_value_unit VARCHAR,
            data_value_type VARCHAR, county VARCHAR, total_pop_18plus VARCHAR
        )
        """
    )
    rows = []
    for county, adults, smoking in COUNTIES:
        rows += [
            (2023, "Health Risk Behaviors", SMOKING, smoking, "%",
             "Age-adjusted prevalence", county, adults),
            # Crude rows must never mix into the age-adjusted result.
            (2023, "Health Risk Behaviors", SMOKING, 99.0, "%",
             "Crude prevalence", county, adults),
        ]  # fmt: skip
    # Depression is missing for Essex.
    rows += [
        (2023, "Health Outcomes", DEPRESSION, 20.0, "%",
         "Age-adjusted prevalence", "Addison", "30,000"),
        (2023, "Health Outcomes", DEPRESSION, 22.0, "%",
         "Age-adjusted prevalence", "Chittenden", "150,000"),
    ]  # fmt: skip
    conn.executemany(
        "INSERT INTO cdc_places_county VALUES (?, ?, ?, ?, ?, ?, ?, ?)", rows
    )

    # query.cdc opens the warehouse when imported; hand it the fixture instead.
    monkeypatch.setattr(production_db, "get_db", lambda: conn)
    module = importlib.import_module("query.cdc")
    monkeypatch.setattr(module, "DB", conn)
    return module


def fetch(cdc, filters: dict) -> pd.DataFrame:
    """Mirror the /load/data/cdc/places route, including the year range the
    Reports by Topic page always sends."""
    request = FilterRequest(filters={**filters, "year": {"min": 2024, "max": 2024}})
    source = request_to_source(request, "cdc_places_county", "default")
    return cdc.get_cdc_places_tidy([source]).set_index("Measure")


def test_one_county_returns_its_own_estimate(cdc):
    result = fetch(cdc, {"County": ["Addison"]})
    assert result.loc[SMOKING, "Value"] == 10.0
    assert result.loc[DEPRESSION, "Value"] == 20.0


def test_statewide_is_adult_weighted_average_not_first_county(cdc):
    result = fetch(cdc, {})

    # One row per measure, not one per county.
    assert result.index.is_unique
    # (10*30k + 9*150k + 17*5k) / 185k = 9.378 -> 9.4. The first county
    # would be 10.0 and an unweighted mean 12.0.
    assert result.loc[SMOKING, "Value"] == 9.4


def test_statewide_measure_missing_a_county_is_null(cdc):
    result = fetch(cdc, {})
    # Averaging only Addison and Chittenden would silently drop Essex.
    assert pd.isna(result.loc[DEPRESSION, "Value"])
