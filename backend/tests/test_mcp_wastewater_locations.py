"""St. Johnsbury resolves by GEOID and every spelling; St. Albans stays split."""

import duckdb
import pytest

from data_tools.catalog import search_locations
from data_tools.service import DataToolService

JOHNSBURY = "5000562200"
ALBANS_CITY = "5001161675"
ALBANS_TOWN = "5001161750"


@pytest.fixture
def warehouse(tmp_path):
    path = tmp_path / "warehouse.duckdb"
    with duckdb.connect(str(path)) as conn:
        conn.execute("CREATE TABLE vt_county_geoids(NAME VARCHAR, GEOID VARCHAR)")
        conn.execute(
            "INSERT INTO vt_county_geoids VALUES "
            "('Caledonia County, Vermont', '50005'), "
            "('Franklin County, Vermont', '50011')"
        )
        conn.execute(
            "CREATE TABLE vt_town_lines_geom(FIPS_ID VARCHAR, TOWN_NAME VARCHAR)"
        )
        conn.execute(
            "INSERT INTO vt_town_lines_geom VALUES "
            f"('{JOHNSBURY}', 'St. Johnsbury town'), "
            f"('{ALBANS_CITY}', 'St. Albans city'), "
            f"('{ALBANS_TOWN}', 'St. Albans town')"
        )
        # Census-style name in the row, as the standardized ETL writes it.
        conn.execute(
            "CREATE TABLE VersoWastewater_treatmentFacilities_info("
            "facility_id VARCHAR, facility_name VARCHAR, town VARCHAR, "
            "geoid VARCHAR, county VARCHAR, county_fips VARCHAR, rpc VARCHAR, "
            "design_hydraulic_capacity_mgd VARCHAR, septage_received VARCHAR, "
            "ww_inventory_url VARCHAR)"
        )
        conn.execute(
            "INSERT INTO VersoWastewater_treatmentFacilities_info VALUES "
            f"('1', 'Coltec', 'St. Johnsbury town', '{JOHNSBURY}', 'Caledonia', '50005', 'NVDA', '1', 'No', ''), "
            f"('2', 'Weidmann', 'St. Johnsbury town', '{JOHNSBURY}', 'Caledonia', '50005', 'NVDA', '1', 'No', ''), "
            f"('3', 'St Albans City WWTF', 'St. Albans city', '{ALBANS_CITY}', 'Franklin', '50011', 'NRPC', '1', 'No', ''), "
            f"('4', 'St Albans Town', 'St. Albans town', '{ALBANS_TOWN}', 'Franklin', '50011', 'NRPC', '1', 'No', '')"
        )
    return path


def ids(warehouse, query):
    with duckdb.connect(str(warehouse), read_only=True) as conn:
        return {p["id"] for p in search_locations(conn, query, "county_subdivision")}


@pytest.mark.parametrize(
    "query",
    ["St. Johnsbury", "Saint Johnsbury", "St Johnsbury", "StJohnsbury", "Johnsbury"],
)
def test_johnsbury_spellings_resolve(warehouse, query):
    assert ids(warehouse, query) == {JOHNSBURY}


def test_albans_city_and_town_stay_separate(warehouse):
    assert ids(warehouse, "Saint Albans city") == {ALBANS_CITY}
    assert ids(warehouse, "St Albans town") == {ALBANS_TOWN}
    # The bare name is ambiguous, so it returns both candidates, never one.
    assert ids(warehouse, "Saint Albans") == {ALBANS_CITY, ALBANS_TOWN}


def test_facilities_by_location_id(warehouse):
    result = DataToolService(warehouse).call(
        "query_data",
        {
            "dataset_id": "wastewater_treatment_facilities",
            "location_ids": [JOHNSBURY],
        },
    )
    assert {r["facility_name"] for r in result["rows"]} == {"Coltec", "Weidmann"}
