"""
Tests for the Community Health report's CDC PLACES query, run against a small
in-memory table instead of the warehouse.

CDC publishes PLACES estimates per county but not for Vermont as a whole. A
statewide pick used to return every county's rows unlabeled, so the report
showed whichever county came first as "Vermont".
"""

import importlib
import math

import duckdb
import pandas as pd
import pytest

from api.core_functions import request_to_source
from api.models import FilterRequest
from query import production_db

SMOKING = "Current cigarette smoking among adults"
DEPRESSION = "Depression among adults"
OBESITY = "Obesity among adults"

# (county, adults as CDC stores them, smoking %, smoking 95% interval)
COUNTIES = [
    ("Addison", "30,000", 10.0, ("8.0", "12.0")),
    ("Chittenden", "150,000", 9.0, ("8.0", "10.0")),
    ("Essex", "5,000", 17.0, ("13.0", "21.0")),
]


@pytest.fixture
def cdc(monkeypatch):
    conn = duckdb.connect()
    conn.execute(
        """
        CREATE TABLE cdc_places_county (
            year BIGINT, category VARCHAR, measure VARCHAR,
            data_value DOUBLE, data_value_unit VARCHAR,
            data_value_type VARCHAR, county VARCHAR, total_pop_18plus VARCHAR,
            low_confidence_limit VARCHAR, high_confidence_limit VARCHAR,
            sme_highlight BOOLEAN
        )
        """
    )
    rows = []
    for county, adults, smoking, (low, high) in COUNTIES:
        rows += [
            (2023, "Health Risk Behaviors", SMOKING, smoking, "%",
             "Age-adjusted prevalence", county, adults, low, high, False),
            # Crude rows must never mix into the age-adjusted result. Like
            # the warehouse, only they carry the key-indicator flag.
            (2023, "Health Risk Behaviors", SMOKING, 99.0, "%",
             "Crude prevalence", county, adults, "98.0", "99.5", True),
            # Obesity has no interval for Essex.
            (2023, "Health Outcomes", OBESITY, 30.0, "%",
             "Age-adjusted prevalence", county, adults,
             None if county == "Essex" else "28.0",
             None if county == "Essex" else "32.0", False),
        ]  # fmt: skip
    # Depression is missing for Essex.
    rows += [
        (2023, "Health Outcomes", DEPRESSION, 20.0, "%",
         "Age-adjusted prevalence", "Addison", "30,000", "18.0", "22.0", False),
        (2023, "Health Outcomes", DEPRESSION, 22.0, "%",
         "Age-adjusted prevalence", "Chittenden", "150,000", "21.0", "23.0", False),
    ]  # fmt: skip
    conn.executemany(
        "INSERT INTO cdc_places_county VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        rows,
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


def test_one_county_returns_its_published_interval(cdc):
    result = fetch(cdc, {"County": ["Addison"]})
    assert (result.loc[SMOKING, "Low"], result.loc[SMOKING, "High"]) == (8.0, 12.0)


def test_statewide_is_adult_weighted_average_not_first_county(cdc):
    result = fetch(cdc, {})

    # One row per measure, not one per county.
    assert result.index.is_unique
    # (10*30k + 9*150k + 17*5k) / 185k = 9.378 -> 9.4. The first county
    # would be 10.0 and an unweighted mean 12.0.
    assert result.loc[SMOKING, "Value"] == 9.4


def test_statewide_interval_combines_county_intervals(cdc):
    result = fetch(cdc, {})

    # Half-widths 2, 1, 4 weighted by adults, combined as a root sum of
    # squares: sqrt((30k*2)^2 + (150k*1)^2 + (5k*4)^2) / 185k = 0.88.
    value = (10 * 30_000 + 9 * 150_000 + 17 * 5_000) / 185_000
    half = math.hypot(30_000 * 2, 150_000 * 1, 5_000 * 4) / 185_000
    assert result.loc[SMOKING, "Low"] == round(value - half, 1) == 8.5
    assert result.loc[SMOKING, "High"] == round(value + half, 1) == 10.3


def test_statewide_interval_null_when_a_county_has_none(cdc):
    result = fetch(cdc, {})
    assert result.loc[OBESITY, "Value"] == 30.0
    assert pd.isna(result.loc[OBESITY, "Low"])
    assert pd.isna(result.loc[OBESITY, "High"])


def test_statewide_measure_missing_a_county_is_null(cdc):
    result = fetch(cdc, {})
    # Averaging only Addison and Chittenden would silently drop Essex.
    assert pd.isna(result.loc[DEPRESSION, "Value"])
    assert pd.isna(result.loc[DEPRESSION, "Low"])


def test_key_indicator_is_looked_up_per_measure(cdc):
    result = fetch(cdc, {"County": ["Addison"]})
    # Only the crude smoking rows are flagged, but the age-adjusted row the
    # report shows still counts as a key indicator.
    assert bool(result.loc[SMOKING, "Key_Indicator"]) is True
    assert bool(result.loc[DEPRESSION, "Key_Indicator"]) is False
