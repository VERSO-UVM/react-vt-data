"""Opt-in smoke tests against a deployed/rebuilt warehouse; excluded by default.

MCP_LIVE_WAREHOUSE=/absolute/path/warehouse.duckdb uv run pytest tests/test_mcp_live.py
These tests require all catalog sources, including ACS2020 and Census2020.
"""

import os

import pytest

from data_tools.catalog import DATASETS
from data_tools.service import DataToolService

WAREHOUSE = os.environ.get("MCP_LIVE_WAREHOUSE")
pytestmark = pytest.mark.skipif(
    not WAREHOUSE, reason="Set MCP_LIVE_WAREHOUSE for real-data checks"
)


@pytest.fixture(scope="module")
def live_service():
    return DataToolService(WAREHOUSE)


@pytest.mark.parametrize("dataset_id", DATASETS)
def test_registered_source_readable(live_service, dataset_id):
    description = live_service.call("describe_dataset", {"dataset_id": dataset_id})
    assert description["available"]
    variables = live_service.call(
        "search_variables", {"dataset_id": dataset_id, "limit": 2}
    )
    assert "variables" in variables
    page = live_service.call("query_data", {"dataset_id": dataset_id, "limit": 2})
    assert page["row_count"] > 0
    assert "geometry" not in page["columns"]
    assert page["provenance"]["source_url"].startswith("https://")
    csv = live_service.call("export_data", {"dataset_id": dataset_id, "limit": 2})
    assert csv["row_count"] == page["row_count"]
    assert csv["csv"]


def test_known_census_population(live_service):
    page = live_service.call(
        "get_timeseries",
        {
            "dataset_id": "acs5_ts_historic_population",
            "location_ids": ["50"],
            "years": [2020],
        },
    )
    assert page["row_count"] == 1
    assert page["rows"][0]["Population"] == 643077


def test_report_generation_workflow(live_service):
    places = live_service.call(
        "search_locations",
        {"query": "Rutland", "geo_type": "county_subdivision", "limit": 3},
    )["locations"]
    assert any(place["name"].startswith("Rutland city,") for place in places)
    dataset = "acs5_ts_median_home_value"
    variable = live_service.call("search_variables", {"dataset_id": dataset})[
        "variables"
    ][0]["variable_id"]
    comparison = live_service.call(
        "compare_places",
        {
            "dataset_id": dataset,
            "location_ids": ["5000710675", "5002346000"],
            "variable_ids": [variable],
        },
    )
    assert comparison["row_count"] == 2
    assert len({row["year"] for row in comparison["rows"]}) == 1
    assert all(row["Median_Home_Value"] > 0 for row in comparison["rows"])
    zoning = live_service.call("get_zoning_summary", {"municipality": "Burlington"})
    assert zoning["row_count"] > 0
