"""Independent regressions for deadlines, complete pagination and comparisons."""

import csv
import io
import time

import duckdb
import pytest

from data_tools import catalog
from data_tools.service import DataToolError, DataToolService, json_bytes


@pytest.fixture
def review_warehouse(tmp_path):
    path = tmp_path / "warehouse.duckdb"
    with duckdb.connect(str(path)) as conn:
        conn.execute("CREATE TABLE vt_county_geoids(NAME VARCHAR, GEOID VARCHAR)")
        conn.execute(
            "INSERT INTO vt_county_geoids VALUES "
            "('Addison County, Vermont', '50001'), "
            "('Chittenden County, Vermont', '50007')"
        )
        conn.execute(
            "CREATE TABLE acs5_housing_tidy(year VARCHAR, name VARCHAR, "
            "geo_type VARCHAR, section VARCHAR, variable VARCHAR, "
            "value DOUBLE, percent DOUBLE)"
        )
        for place in ("Addison", "Chittenden"):
            for variable in ("Owners", "Renters"):
                conn.execute(
                    "INSERT INTO acs5_housing_tidy VALUES (?, ?, ?, ?, ?, ?, ?)",
                    [
                        "2022",
                        f"{place} County, Vermont",
                        "county",
                        "Tenure",
                        variable,
                        100,
                        50,
                    ],
                )
        conn.execute(
            "INSERT INTO acs5_housing_tidy VALUES "
            "('2023', 'Addison County, Vermont', 'county', 'Tenure', 'Owners', 100, 50), "
            "('2023', 'Chittenden County, Vermont', 'county', 'Tenure', 'Renters', 100, 50)"
        )
        conn.execute(
            "CREATE TABLE VersoZoning_info(object_id INTEGER, county VARCHAR, "
            "town VARCHAR, geoid VARCHAR, district_name VARCHAR, "
            "district_type VARCHAR, overlay_district VARCHAR, acres DOUBLE)"
        )
        conn.executemany(
            "INSERT INTO VersoZoning_info VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [
                (
                    index,
                    "Addison",
                    "Addison",
                    "5000100325",
                    "é" * 250,
                    "Residential",
                    "No",
                    index,
                )
                for index in range(25)
            ],
        )
    return path


def test_deadline_between_queries_prevents_starting_further_sql(
    review_warehouse, monkeypatch
):
    completed_late_sql = []

    def delayed_python_processing(conn, query):
        # SQL may finish before the watchdog fires while catalog processing uses
        # CPU; its next query must not start with an already-expired deadline.
        conn.execute("SELECT 1").fetchone()
        time.sleep(0.12)
        conn.execute("SELECT 2").fetchone()
        completed_late_sql.append(True)
        return []

    monkeypatch.setattr(catalog, "list_datasets", delayed_python_processing)
    service = DataToolService(review_warehouse, query_timeout=0.03, max_concurrency=1)
    with pytest.raises(DataToolError, match="time limit"):
        service.call("list_datasets", {})
    assert not completed_late_sql, "Expired requests must not start another SQL query"
    service.query_timeout = 1
    assert service.health()["status"] == "ok"


@pytest.mark.parametrize("tool", ["query_data", "export_data"])
def test_byte_limited_pages_preserve_every_row_without_duplicates(
    review_warehouse, tool
):
    service = DataToolService(review_warehouse, max_bytes=4096)
    arguments = {"dataset_id": "zoning_districts", "limit": 25}
    ids = []
    pages = 0
    while True:
        result = service.call(tool, arguments)
        assert len(json_bytes(result)) <= 4096
        assert result["row_count"] > 0
        rows = (
            list(csv.DictReader(io.StringIO(result["csv"])))
            if tool == "export_data"
            else result["rows"]
        )
        ids.extend(int(row["object_id"]) for row in rows)
        pages += 1
        if not result["has_more"]:
            assert result["next_cursor"] is None
            break
        assert result["next_cursor"]
        arguments["cursor"] = result["next_cursor"]
        assert pages < 30, "Continuation must advance past the actual returned rows"
    assert pages > 1, "The byte bound should reduce the requested 25-row page"
    assert ids == list(range(25))


def test_comparison_requires_each_variable_at_each_place_in_common_year(
    review_warehouse,
):
    service = DataToolService(review_warehouse)
    variables = service.call("search_variables", {"dataset_id": "acs5_housing"})[
        "variables"
    ]
    arguments = {
        "dataset_id": "acs5_housing",
        "location_ids": ["50001", "50007"],
        "variable_ids": [variable["variable_id"] for variable in variables],
    }
    result = service.call("compare_places", arguments)
    assert result["comparison_year"] == 2022
    assert len(result["rows"]) == 4
    assert {(row["_location_id"], row["variable"]) for row in result["rows"]} == {
        (place, variable)
        for place in ("50001", "50007")
        for variable in ("Owners", "Renters")
    }
    with pytest.raises(DataToolError, match="No common"):
        service.call(
            "compare_places", arguments | {"year_policy": "explicit", "years": [2023]}
        )


def test_cursor_from_another_server_instance_is_rejected(review_warehouse):
    first = DataToolService(review_warehouse)
    arguments = {"dataset_id": "acs5_housing", "limit": 1}
    cursor = first.call("query_data", arguments)["next_cursor"]
    restarted = DataToolService(review_warehouse)
    with pytest.raises(DataToolError, match="cursor"):
        restarted.call("query_data", arguments | {"cursor": cursor})
