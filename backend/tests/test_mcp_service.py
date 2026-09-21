"""Contract and correctness tests use a tiny warehouse, never production data."""

import csv
import io
import json
from concurrent.futures import ThreadPoolExecutor

import duckdb
import pytest
from pydantic import ValidationError

from data_tools.models import TOOL_MODELS
from data_tools.service import DataToolError, DataToolService


@pytest.fixture
def warehouse(tmp_path):
    path = tmp_path / "warehouse.duckdb"
    with duckdb.connect(str(path)) as conn:
        conn.execute("CREATE TABLE vt_county_geoids(NAME VARCHAR, GEOID VARCHAR)")
        conn.execute(
            "INSERT INTO vt_county_geoids VALUES ('Addison County, Vermont', '50001'), ('Chittenden County, Vermont', '50007')"
        )
        conn.execute(
            "CREATE TABLE acs5Economics_medianHouseholdIncome_timeseries(year VARCHAR, NAME VARCHAR, Median_Household_Income DOUBLE, geo_type VARCHAR)"
        )
        conn.execute(
            "INSERT INTO acs5Economics_medianHouseholdIncome_timeseries VALUES ('2021', 'Addison County, Vermont', 61000, 'county'), ('2022', 'Addison County, Vermont', 64000, 'county'), ('2023', 'Addison County, Vermont', 68000, 'county'), ('2021', 'Chittenden County, Vermont', 71000, 'county'), ('2022', 'Chittenden County, Vermont', 75000, 'county')"
        )
        conn.execute(
            "CREATE TABLE acs5_housing_tidy(year VARCHAR, NAME VARCHAR, geo_type VARCHAR, Section VARCHAR, Variable VARCHAR, Value DOUBLE, Percent DOUBLE)"
        )
        conn.execute(
            "INSERT INTO acs5_housing_tidy VALUES ('2022', 'Addison County, Vermont', 'county', 'Occupancy', 'Occupied housing units', 12000, 80), ('2023', 'Addison County, Vermont', 'county', 'Occupancy', 'Occupied housing units', 13000, 81), ('2023', 'Chittenden County, Vermont', 'county', 'Occupancy', 'Occupied housing units', -666666666, 82), ('2023', 'Addison County, Vermont', 'county', 'Tenure', 'Owner occupied', 10000, 70)"
        )
        conn.execute(
            "CREATE TABLE VersoZoning_info(OBJECT_ID INTEGER, County VARCHAR, Municipal_Name VARCHAR, GEO_ID VARCHAR, District_Name VARCHAR, District_Type VARCHAR, Overlay_District VARCHAR, Acres DOUBLE)"
        )
        conn.execute(
            "INSERT INTO VersoZoning_info VALUES (1, 'Addison', 'Addison', '5000100325', '=unsafe', 'Residential', 'No', 100), (2, 'Addison', 'Addison', '5000100325', 'R2', 'Residential', 'No', 50), (3, 'Addison', 'Addison', '5000100325', 'Flood overlay', 'Overlay', 'Yes', 80), (4, 'Addison', 'Addison', '5000100325', 'Unknown acres', 'Residential', 'No', NULL)"
        )
    return path


@pytest.fixture
def service(warehouse):
    return DataToolService(warehouse)


def income_variable(service):
    result = service.call(
        "search_variables", {"dataset_id": "acs5_ts_household_income"}
    )
    return result["variables"][0]["variable_id"]


def test_discovery_reports_availability_and_real_coverage(service):
    datasets = service.call("list_datasets", {})["datasets"]
    assert len(datasets) >= 31
    assert any(d["dataset_id"] == "acs5_ts_household_income" for d in datasets)
    assert service.health()["available_datasets"] >= 3
    described = service.call("describe_dataset", {"dataset_id": "acs5_housing"})
    assert "Percent" in json.dumps(described)
    assert "warehouse_version" in described


def test_canonical_places_and_exact_observations(service):
    places = service.call(
        "search_locations", {"query": "Addison", "geo_type": "county"}
    )["locations"]
    assert places[0]["id"] == "50001"
    result = service.call(
        "query_data",
        {
            "dataset_id": "acs5_ts_household_income",
            "location_ids": ["50001"],
            "years": [2022],
        },
    )
    assert result["row_count"] == 1
    assert result["rows"][0]["Median_Household_Income"] == 64000
    assert result["rows"][0]["_location_id"] == "50001"
    assert result["provenance"]["source_url"].startswith("https://")


def test_value_and_percent_separate_and_sentinel_null(service):
    result = service.call(
        "query_data",
        {
            "dataset_id": "acs5_housing",
            "years": [2023],
            "filters": {"Variable": ["Occupied housing units"]},
        },
    )
    assert len(result["rows"]) == 2
    chittenden = next(
        row for row in result["rows"] if row["NAME"].startswith("Chittenden")
    )
    assert chittenden["Value"] is None
    assert chittenden["Percent"] == 82
    percent_only = service.call(
        "query_data", {"dataset_id": "acs5_housing", "measures": ["Percent"]}
    )
    assert all("Value" not in row for row in percent_only["rows"])


def test_variable_selection_does_not_mix_sections(service):
    variables = service.call(
        "search_variables",
        {"dataset_id": "acs5_housing", "query": "Occupied housing units"},
    )["variables"]
    result = service.call(
        "query_data",
        {"dataset_id": "acs5_housing", "variable_ids": [variables[0]["variable_id"]]},
    )
    assert result["row_count"] == 3
    assert {row["Section"] for row in result["rows"]} == {"Occupancy"}


def test_timeseries_preserves_actual_years_and_order(service):
    result = service.call(
        "get_timeseries",
        {
            "dataset_id": "acs5_ts_household_income",
            "location_ids": ["50007"],
            "year_min": 2020,
            "year_max": 2024,
        },
    )
    assert [row["year"] for row in result["rows"]] == [2021, 2022]
    with pytest.raises(ValueError, match="observation years"):
        service.call("get_timeseries", {"dataset_id": "zoning_districts"})


def test_compare_aligns_latest_common_year(service):
    result = service.call(
        "compare_places",
        {
            "dataset_id": "acs5_ts_household_income",
            "location_ids": ["50001", "50007"],
            "variable_ids": [income_variable(service)],
        },
    )
    assert result["comparison_year"] == 2022
    assert {row["year"] for row in result["rows"]} == {2022}
    assert {row["Median_Household_Income"] for row in result["rows"]} == {64000, 75000}
    with pytest.raises(ValueError, match="No common"):
        service.call(
            "compare_places",
            {
                "dataset_id": "acs5_ts_household_income",
                "location_ids": ["50001", "50007"],
                "variable_ids": [income_variable(service)],
                "year_policy": "explicit",
                "years": [2023],
            },
        )


def test_pagination_is_complete_without_duplicates(service):
    args = {"dataset_id": "acs5_ts_household_income", "limit": 2}
    rows = []
    while True:
        result = service.call("query_data", args)
        rows.extend(result["rows"])
        if not result["has_more"]:
            break
        args["cursor"] = result["next_cursor"]
    assert len(rows) == 5
    assert len({(row["NAME"], row["year"]) for row in rows}) == 5


def test_cursors_bound_to_query_tool_and_warehouse(service, warehouse):
    args = {"dataset_id": "acs5_ts_household_income", "limit": 1}
    cursor = service.call("query_data", args)["next_cursor"]
    for tool, changed in (
        ("query_data", {"limit": 2}),
        ("get_timeseries", {}),
        ("query_data", {"cursor": cursor + "x"}),
    ):
        with pytest.raises(ValueError, match="cursor"):
            service.call(tool, args | {"cursor": cursor} | changed)
    warehouse.touch()
    with pytest.raises(ValueError, match="cursor"):
        service.call("query_data", args | {"cursor": cursor})


@pytest.mark.parametrize(
    "changes",
    [
        {"filters": {"not_a_column": ["x"]}},
        {"filters": {"NAME; DROP TABLE vt_county_geoids": ["x"]}},
        {"location_ids": ["99999"]},
        {"geo_type": "tract", "location_ids": ["50001"]},
        {"measures": ["not_a_measure"]},
        {"variable_ids": ["malformed"]},
    ],
)
def test_reject_unsupported_requests(service, changes):
    with pytest.raises(ValueError):
        service.call("query_data", {"dataset_id": "acs5_ts_household_income"} | changes)


def test_sql_injection_values_are_literals(service):
    result = service.call(
        "query_data",
        {"dataset_id": "acs5_housing", "filters": {"Variable": ["x' OR 1=1 --"]}},
    )
    assert result["rows"] == []
    assert service.health()["status"] == "ok"
    with pytest.raises(ValueError):
        service.call("query_data", {"dataset_id": "read_csv('/etc/passwd')"})


@pytest.mark.parametrize(
    "args",
    [
        {"limit": 1001},
        {"filters": {"Variable": []}},
        {"year_min": 2025, "year_max": 2020},
        {"years": [2020], "year_min": 2019},
        {"surprise": True},
    ],
)
def test_strict_schema(args):
    with pytest.raises(ValidationError):
        TOOL_MODELS["query_data"].model_validate({"dataset_id": "acs5_housing"} | args)


def test_zoning_excludes_overlays_and_reports_unknown_acres(service):
    result = service.call("get_zoning_summary", {"municipality": "Addison"})
    assert len(result["rows"]) == 1
    assert result["rows"][0]["district_count"] == 3
    assert result["rows"][0]["recorded_acres"] == 150
    assert result["rows"][0]["districts_missing_acres"] == 1
    assert (
        len(service.call("get_zoning_summary", {"include_overlays": True})["rows"]) == 2
    )


def test_export_matches_query_and_escapes_spreadsheet_formulas(service):
    result = service.call("export_data", {"dataset_id": "zoning_districts", "limit": 1})
    assert result["media_type"] == "text/csv"
    assert result["truncated"] and result["next_cursor"]
    exported = list(csv.DictReader(io.StringIO(result["csv"])))
    assert exported[0]["District_Name"] == "'=unsafe"
    assert "rows" not in result


def test_concurrency_isolated_connections(service):
    with ThreadPoolExecutor(max_workers=4) as pool:
        results = list(
            pool.map(
                lambda year: service.call(
                    "query_data",
                    {"dataset_id": "acs5_ts_household_income", "years": [year]},
                ),
                [2021, 2022, 2023, 2021],
            )
        )
    assert [r["row_count"] for r in results] == [2, 2, 1, 2]


def test_response_row_and_byte_caps(warehouse):
    service = DataToolService(warehouse, max_rows=1, max_bytes=4096)
    result = service.call(
        "query_data", {"dataset_id": "acs5_ts_household_income", "limit": 1000}
    )
    assert result["row_count"] == 1
    assert len(json.dumps(result).encode()) < 4096
    assert result["has_more"]


def test_missing_warehouse_fails_without_creating_file(tmp_path):
    path = tmp_path / "missing.duckdb"
    service = DataToolService(path)
    with pytest.raises(DataToolError, match="Warehouse unavailable"):
        service.call("list_datasets", {})
    assert not path.exists()


def test_deadline_interrupts_work_and_releases_slot(warehouse, monkeypatch):
    from data_tools import catalog

    def expensive(conn, query):
        conn.execute(
            "SELECT SUM(a.range * b.range) FROM range(100000000) a, range(100000000) b"
        ).fetchall()
        return []

    monkeypatch.setattr(catalog, "list_datasets", expensive)
    service = DataToolService(warehouse, query_timeout=0.05, max_concurrency=1)
    with pytest.raises(DataToolError, match="time limit"):
        service.call("list_datasets", {})
    assert service.health()["status"] == "ok"
