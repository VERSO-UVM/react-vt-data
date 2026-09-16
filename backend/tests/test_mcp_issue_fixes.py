"""Regressions from report-generation queries, with deliberately imperfect data."""

import asyncio
import csv
import io
import json

import duckdb
import httpx2
import pytest
from mcp import Client
from mcp.client.streamable_http import streamable_http_client

from data_tools.service import DataToolService
from mcp_server.config import MCPSettings
from mcp_server.server import create_app


@pytest.fixture
def service(tmp_path):
    warehouse = tmp_path / "issues.duckdb"
    with duckdb.connect(str(warehouse)) as conn:
        conn.execute("""
            CREATE TABLE vt_county_geoids(NAME VARCHAR, GEOID VARCHAR);
            INSERT INTO vt_county_geoids VALUES ('Rutland County, Vermont', '50021');
            CREATE TABLE vt_town_lines_geom(FIPS_ID VARCHAR, TOWN_NAME VARCHAR);
            INSERT INTO vt_town_lines_geom VALUES
                ('5002161225', 'Rutland city'), ('5002161300', 'Rutland town');
            CREATE TABLE acs5_dp_combined_tidy(
                year VARCHAR, NAME VARCHAR, "table" VARCHAR, Category VARCHAR,
                Subcategory VARCHAR, Variable VARCHAR, Measure VARCHAR, Value VARCHAR
            );
            INSERT INTO acs5_dp_combined_tidy VALUES
                ('2009', 'Rutland city, Rutland County, Vermont', 'DP04', 'Estimate', 'GROSS RENT', 'Occupied units paying rent: Median (dollars)', 'Number', '650'),
                ('2011', 'Rutland city, Rutland County, Vermont', 'DP04', 'GROSS RENT', 'Median (dollars)', 'Total', 'Estimate', '690'),
                ('2013', 'Rutland city, Rutland County, Vermont', 'DP04', 'GROSS RENT', 'Occupied units paying rent', 'Median (dollars)', 'Estimate', '720'),
                ('2013', 'Rutland city, Rutland County, Vermont', 'DP04', 'GRAPI', 'Occupied units paying rent', 'Total', 'Percent', '9418'),
                ('2013', 'Rutland city, Rutland County, Vermont', 'DP04', 'GRAPI', 'Occupied units paying rent', 'Total', 'Percent', '50'),
                ('2011', 'Rutland city, Rutland County, Vermont', 'DP04', 'GRAPI', '35.0 percent or more', 'Total', 'Percent', '22.5'),
                ('2013', 'Rutland city, Rutland County, Vermont', 'DP04', 'GRAPI', 'Occupied units paying rent', 'Not computed', 'Percent', '-888888888');
            CREATE TABLE VersoZoning_info(
                OBJECT_ID INTEGER, County VARCHAR, Municipal_Name VARCHAR, GEO_ID VARCHAR,
                District_Name VARCHAR, District_Type VARCHAR, Overlay_District VARCHAR,
                Acres DOUBLE, Base_Density DOUBLE, Notes VARCHAR
            );
            INSERT INTO VersoZoning_info VALUES
                (1, 'Rutland', 'Rutland City', '5002161300', 'Residential', 'Residential', 'No', 100, 10, repeat('Long source notes ', 200)),
                (2, 'Rutland', 'Rutland Town', '5002161300', 'Rural', 'Residential', 'No', 500, 1, 'Town notes'),
                (3, 'Rutland', 'Rutland City', '5002161300', 'Flood overlay', 'Overlay', 'Yes', 40, NULL, 'Source overlay'),
                (4, 'Rutland', 'Rutland City', NULL, 'Downtown', 'Mixed', 'No', 25, 20, 'Missing source ID');
            CREATE TABLE VersoZoning_wide AS SELECT * EXCLUDE(Municipal_Name), Municipal_Name || ' ' AS Municipal_Name FROM VersoZoning_info;
        """)
    return DataToolService(warehouse)


def test_partial_variable_series_exposes_other_dataset_years(service):
    variables = service.call(
        "search_variables",
        {"dataset_id": "acs5_dp", "query": "GROSS RENT Median (dollars)"},
    )["variables"]
    assert len(variables) == 3
    old = next(
        variable for variable in variables if variable["years_available"] == [2009]
    )
    result = service.call(
        "get_timeseries",
        {
            "dataset_id": "acs5_dp",
            "variable_ids": [old["variable_id"]],
            "location_ids": ["5002161225"],
        },
    )
    assert [row["year"] for row in result["rows"]] == [2009]
    assert result["coverage"]["selector_years_available"] == [2009]
    assert result["coverage"]["years_without_matching_observations"] == [2011, 2013]
    assert result["hints"][0]["code"] == "selector_year_coverage"


def test_empty_year_filter_reports_coverage_before_year_constraint(service):
    result = service.call(
        "query_data",
        {
            "dataset_id": "acs5_dp",
            "filters": {"year": [2010], "Category": ["gross rent"]},
        },
    )
    assert result["rows"] == []
    assert result["coverage"]["selector_years_available"] == [2011, 2013]
    assert result["coverage"]["years_without_matching_observations"] == [2010]
    assert any(hint["code"] == "selector_year_coverage" for hint in result["hints"])


@pytest.mark.parametrize(
    "constraint,missing_year", [({"year_min": 2025}, 2025), ({"year_max": 2000}, 2000)]
)
def test_open_year_range_outside_dataset_keeps_explicit_constraint(
    service, constraint, missing_year
):
    result = service.call("get_timeseries", {"dataset_id": "acs5_dp", **constraint})
    assert result["rows"] == []
    assert result["coverage"]["requested_years"] == [missing_year]
    assert result["coverage"]["years_without_matching_observations"] == [missing_year]
    field = next(iter(constraint))
    assert result["coverage"][f"requested_{field}"] == missing_year
    assert any(hint["code"] == "selector_year_coverage" for hint in result["hints"])


def test_empty_filter_diagnostics_suggest_values_without_changing_query(service):
    result = service.call(
        "query_data",
        {"dataset_id": "zoning_bylaws", "filters": {"Municipal_Name": ["Rutland Cty"]}},
    )
    assert result["rows"] == []
    hint = next(hint for hint in result["hints"] if hint["code"] == "filter_matches")
    assert hint["matching_rows_alone"] == 0
    assert hint["suggested_values"][0] == "Rutland City"
    assert result["applied_query"]["filters"] == {"Municipal_Name": ["Rutland Cty"]}


def test_projection_bounds_wide_rows_and_retains_hidden_location_resolution(service):
    args = {
        "dataset_id": "zoning_bylaws",
        "location_ids": ["5002161225"],
        "columns": ["District_Name", "GEO_ID", "_location_id"],
    }
    result = service.call("query_data", args)
    assert result["row_count"] == 3
    assert result["columns"] == args["columns"]
    assert all(list(row) == args["columns"] for row in result["rows"])
    assert {row["_location_id"] for row in result["rows"]} == {"5002161225"}
    assert {row["GEO_ID"] for row in result["rows"]} == {"5002161300", None}
    assert result["location_diagnostics"]["mismatched_source_geoid_count"] == 2
    full = service.call(
        "query_data", {"dataset_id": "zoning_bylaws", "location_ids": ["5002161225"]}
    )
    assert len(json.dumps(result)) < len(json.dumps(full))
    exported = service.call("export_data", args)
    reader = csv.DictReader(io.StringIO(exported["csv"]))
    assert reader.fieldnames == args["columns"]
    assert len(list(reader)) == 3


def test_city_records_never_leak_into_town_query(service):
    result = service.call(
        "query_data", {"dataset_id": "zoning_districts", "location_ids": ["5002161300"]}
    )
    assert [row["District_Name"] for row in result["rows"]] == ["Rural"]
    assert result["location_diagnostics"]["conflicting_geoid_districts_excluded"] == 2


def test_text_filters_ignore_case_and_outer_spaces_but_preserve_source_text(service):
    args = {
        "dataset_id": "zoning_bylaws",
        "filters": {"Municipal_Name": ["  rUTLAND cITY  "]},
        "columns": ["Municipal_Name", "District_Name"],
    }
    rows = service.call("query_data", args)["rows"]
    assert len(rows) == 3
    assert {row["Municipal_Name"] for row in rows} == {"Rutland City "}
    exported = list(
        csv.DictReader(io.StringIO(service.call("export_data", args)["csv"]))
    )
    assert exported == rows


@pytest.mark.parametrize(
    "options",
    [
        {},
        {"include_row_units": False},
        {"columns": ["Value", "_units", "_location_id"]},
    ],
)
def test_columns_are_stable_for_empty_and_nonempty_results(service, options):
    args = {"dataset_id": "acs5_dp", **options}
    populated = service.call("query_data", args)
    empty = service.call("query_data", {**args, "years": [2010]})
    assert empty["rows"] == []
    assert empty["columns"] == populated["columns"]
    assert all(list(row) == populated["columns"] for row in populated["rows"])
    assert ("_units" in populated["columns"]) == options.get("include_row_units", True)


def test_numeric_totals_preserved_without_claiming_percent_units(service):
    result = service.call(
        "query_data", {"dataset_id": "acs5_dp", "filters": {"Category": ["GRAPI"]}}
    )
    totals = [row for row in result["rows"] if row["Value"] in (9418, 50)]
    assert len(totals) == 2
    assert all("not verified" in row["_units"]["Value"] for row in totals)
    bracket = next(row for row in result["rows"] if row["Value"] == 22.5)
    assert bracket["_units"]["Value"] == "percent"
    assert (
        next(row for row in result["rows"] if row["Variable"] == "Not computed")[
            "Value"
        ]
        is None
    )
    assert result["warnings"][0]["code"] == "unverified_profile_units"


def test_distinct_values_accept_filters_through_service_contract(service):
    result = service.call(
        "describe_dataset",
        {
            "dataset_id": "acs5_dp",
            "value_column": "Measure",
            "value_filters": {"Category": [" gross rent "]},
            "value_limit": 1,
        },
    )
    assert result["filter_values"]["values"] == ["Estimate"]
    assert result["filter_values"]["has_more"] is False


def test_zoning_summary_resolves_city_and_reports_excluded_districts(service):
    result = service.call("get_zoning_summary", {"location_id": "5002161225"})
    assert sum(row["district_count"] for row in result["rows"]) == 2
    assert sum(row["recorded_acres"] for row in result["rows"]) == 125
    assert result["excluded_overlays"]["district_count"] == 1
    assert result["excluded_overlays"]["recorded_acres"] == 40
    with pytest.raises(
        ValueError, match="Ambiguous municipality.*5002161225.*5002161300"
    ):
        service.call("get_zoning_summary", {"municipality": "Rutland"})


@pytest.mark.parametrize(
    "columns", [["Notes; DROP TABLE VersoZoning_info"], ["geometry"], ["not_a_field"]]
)
def test_projection_rejects_unregistered_columns(service, columns):
    with pytest.raises(ValueError, match="Unsupported output columns"):
        service.call("query_data", {"dataset_id": "zoning_bylaws", "columns": columns})


def test_projection_pagination_does_not_collapse_identical_values(service):
    args = {"dataset_id": "zoning_bylaws", "columns": ["Municipal_Name"], "limit": 1}
    rows = []
    while True:
        result = service.call("query_data", args)
        rows.extend(result["rows"])
        if not result["has_more"]:
            break
        args["cursor"] = result["next_cursor"]
    assert len(rows) == 4
    assert rows.count({"Municipal_Name": "Rutland City "}) == 3


@pytest.mark.parametrize("mode", ["auto", "legacy"])
def test_new_query_contract_roundtrips_over_real_mcp_transport(service, mode):
    app = create_app(MCPSettings(), service)

    async def run():
        async with (
            app.router.lifespan_context(app),
            httpx2.AsyncClient(
                transport=httpx2.ASGITransport(app=app), base_url="http://localhost"
            ) as http,
            Client(
                streamable_http_client("http://localhost/api/mcp", http_client=http),
                mode=mode,
            ) as client,
        ):
            result = await client.call_tool(
                "query_data",
                {
                    "dataset_id": "zoning_bylaws",
                    "location_ids": ["5002161225"],
                    "columns": ["District_Name", "_location_id"],
                },
            )
            assert not result.is_error
            assert result.structured_content["row_count"] == 3
            assert result.structured_content["columns"] == [
                "District_Name",
                "_location_id",
            ]
            discovered = await client.call_tool(
                "describe_dataset",
                {
                    "dataset_id": "acs5_dp",
                    "value_column": "Measure",
                    "value_filters": {"year": [2009]},
                },
            )
            assert not discovered.is_error
            assert discovered.structured_content["filter_values"]["values"] == [
                "Number"
            ]
            summary = await client.call_tool(
                "get_zoning_summary", {"location_id": "5002161225"}
            )
            assert not summary.is_error
            assert (
                summary.structured_content["excluded_overlays"]["district_count"] == 1
            )

    asyncio.run(run())
