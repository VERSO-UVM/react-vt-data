"""Derived-value limitations must accompany discovery and report inputs."""

import asyncio
import csv
import io
import json

import duckdb
import pytest
from mcp import Client

from data_tools.service import DataToolService
from mcp_server.server import create_server

DATASETS = ("cdc_places_county", "cdc_places_tract", "qcew_employment_by_sector")


@pytest.fixture(scope="module")
def service(tmp_path_factory):
    path = tmp_path_factory.mktemp("derived-caveats") / "warehouse.duckdb"
    with duckdb.connect(str(path)) as conn:
        conn.execute("""
            CREATE TABLE vt_county_geoids(NAME VARCHAR, GEOID VARCHAR);
            INSERT INTO vt_county_geoids VALUES
                ('Addison County, Vermont', '50001'),
                ('Chittenden County, Vermont', '50007');
            CREATE TABLE vt_tract_lines_geom(LocationID VARCHAR, name VARCHAR);
            INSERT INTO vt_tract_lines_geom VALUES
                ('50001000100', 'Census Tract 1'),
                ('50007000100', 'Census Tract 1');
            CREATE TABLE qcew_sectorEmployment_timeseries(
                County VARCHAR, year INTEGER, quarter INTEGER, quarter_label VARCHAR,
                sector VARCHAR, employment DOUBLE, employment_4qma DOUBLE
            );
            INSERT INTO qcew_sectorEmployment_timeseries VALUES
                ('Addison', 2023, 1, '2023Q1', 'All industries', 100, 100),
                ('Chittenden', 2023, 1, '2023Q1', 'All industries', 200, 200);
        """)
        for level, places in (
            ("county", [("50001", "Addison County"), ("50007", "Chittenden County")]),
            (
                "tract",
                [("50001000100", "Census Tract 1"), ("50007000100", "Census Tract 1")],
            ),
        ):
            conn.execute(f"""
                CREATE TABLE cdc_places_{level}(
                    geoid VARCHAR, county VARCHAR, stateabbr VARCHAR,
                    year INTEGER, category VARCHAR, measure VARCHAR,
                    data_value_type VARCHAR, data_value DOUBLE, natl_pct DOUBLE
                )
            """)
            for index, (geoid, name) in enumerate(places):
                conn.execute(
                    f"INSERT INTO cdc_places_{level} VALUES (?, ?, 'VT', 2023, "
                    "'Example category', 'Example measure', 'Crude prevalence', 10, ?)",
                    [geoid, name, (index + 7) / 10],
                )
    return DataToolService(path)


def assert_caveats(dataset_id, caveats):
    text = " ".join(caveats).lower()
    expected = (
        (
            "natl_pct",
            "verified national",
            "vermont only",
            "years",
            "age-adjusted",
            "not recorded",
            "do not recompute",
        )
        if dataset_id.startswith("cdc_")
        else (
            "employment_4qma",
            "fewer than four",
            "consecutive",
            "suppressed",
            "carry averages forward",
            "year boundaries",
            "not recorded",
            "do not recompute",
        )
    )
    for phrase in expected:
        assert phrase in text, f"Missing reporting limitation: {phrase}"


@pytest.mark.parametrize("dataset_id", DATASETS)
def test_discovery_and_variable_units_expose_derived_value_limitations(
    service, dataset_id
):
    listing = service.call("list_datasets", {})["datasets"]
    listed = next(row for row in listing if row["dataset_id"] == dataset_id)
    described = service.call("describe_dataset", {"dataset_id": dataset_id})
    for metadata in (listed, described):
        assert_caveats(dataset_id, metadata["caveats"])
    variables = service.call("search_variables", {"dataset_id": dataset_id})[
        "variables"
    ]
    measure = "natl_pct" if dataset_id.startswith("cdc_") else "employment_4qma"
    assert "see caveats" in described["value_columns"][measure]
    assert all(
        "see caveats" in variable["value_columns"][measure] for variable in variables
    )


@pytest.mark.parametrize("dataset_id", DATASETS)
@pytest.mark.parametrize(
    "tool", ["query_data", "get_timeseries", "compare_places", "export_data"]
)
def test_report_results_keep_caveats_after_filtering_and_preserve_values(
    service, dataset_id, tool
):
    is_cdc = dataset_id.startswith("cdc_")
    measure = "natl_pct" if is_cdc else "employment_4qma"
    arguments = {"dataset_id": dataset_id, "years": [2023], "measures": [measure]}
    if is_cdc:
        arguments["filters"] = {"data_value_type": ["Crude prevalence"]}
    if tool == "compare_places":
        variables = service.call("search_variables", {"dataset_id": dataset_id})[
            "variables"
        ]
        arguments.update(
            year_policy="explicit",
            location_ids=["50001000100", "50007000100"]
            if dataset_id.endswith("tract")
            else ["50001", "50007"],
            variable_ids=[variables[0]["variable_id"]],
        )
    result = service.call(tool, arguments)
    assert_caveats(dataset_id, result["provenance"]["caveats"])
    assert "see caveats" in result["units"][measure]
    rows = (
        list(csv.DictReader(io.StringIO(result["csv"])))
        if tool == "export_data"
        else result["rows"]
    )
    assert {float(row[measure]) for row in rows} == (
        {0.7, 0.8} if is_cdc else {100, 200}
    )


def test_mcp_exposes_caveats_in_both_structured_and_text_results(service):
    async def run():
        async with Client(create_server(service)) as client:
            for dataset_id in DATASETS:
                for tool in ("query_data", "export_data"):
                    result = await client.call_tool(tool, {"dataset_id": dataset_id})
                    assert not result.is_error
                    structured = result.structured_content
                    text = json.loads(result.content[0].text)
                    assert_caveats(dataset_id, structured["provenance"]["caveats"])
                    assert (
                        text["provenance"]["caveats"]
                        == structured["provenance"]["caveats"]
                    )

    asyncio.run(run())
