"""Catalog contracts use small in-memory fixtures, never the local warehouse."""

import base64
import json

import duckdb
import pytest

from data_tools.catalog import (
    DATASETS,
    build_locations,
    decode_variable_id,
    describe_dataset,
    encode_variable_id,
    get_dataset,
    list_datasets,
    search_locations,
    search_variables,
    variable_units,
)


@pytest.fixture
def warehouse():
    with duckdb.connect(":memory:") as conn:
        conn.execute("""
            CREATE TABLE acs5_demographics_tidy (
                year VARCHAR, NAME VARCHAR, geo_type VARCHAR,
                Section VARCHAR, Variable VARCHAR, Value DOUBLE, Percent DOUBLE
            );
            INSERT INTO acs5_demographics_tidy VALUES
                ('2020', 'Vermont', 'state', 'Age/Sex', 'Population (ACS)', 640000, NULL),
                ('2024', 'Vermont', 'state', 'Age/Sex', 'Population (ACS)', 647000, NULL),
                ('2024', 'Vermont', 'state', 'Age/Sex', 'Median Age', 43.5, NULL),
                ('unavailable', 'Vermont', 'state', 'Race', 'White', 600000, 92.7);
            CREATE TABLE acs5Demographics_medianAge_timeseries (
                year VARCHAR, NAME VARCHAR, geo_type VARCHAR, Median_Age DOUBLE
            );
            INSERT INTO acs5Demographics_medianAge_timeseries
                VALUES ('2024', 'Vermont', 'state', 43.5);
            CREATE TABLE vt_county_geoids (NAME VARCHAR, GEOID INTEGER);
            INSERT INTO vt_county_geoids VALUES
                ('Chittenden County, Vermont', 50007),
                ('Franklin County, Vermont', 50011),
                ('Orleans County, Vermont', 50019);
            CREATE TABLE vt_town_lines_geom (FIPS_ID VARCHAR, TOWN_NAME VARCHAR);
            INSERT INTO vt_town_lines_geom VALUES
                ('5001161675', 'St. Albans city'),
                ('5001161750', 'St. Albans town'),
                ('5001948925', 'Newport city'),
                ('5001949000', 'Newport town'),
                ('5000710675', 'Burlington city');
            CREATE TABLE vt_tract_lines_geom (LocationID VARCHAR, name VARCHAR);
            INSERT INTO vt_tract_lines_geom VALUES ('50007003900', 'Census Tract 39');
        """)
        yield conn


def test_catalog_covers_every_export_and_profile_flood_extensions():
    # Keep this explicit: renaming a public dataset ID breaks saved agent prompts.
    expected = {
        "acs5_demographics",
        "acs5_economics",
        "acs5_housing",
        "acs5_education",
        "acs5_snapshot",
        "acs5_ts_historic_population",
        "acs5_ts_historic_population_change",
        "acs5_ts_population_change",
        "acs5_ts_median_age",
        "acs5_ts_age_dependency_ratio",
        "acs5_ts_median_home_value",
        "acs5_ts_vacancy_rates",
        "acs5_ts_income_burden",
        "acs5_ts_household_income",
        "acs5_ts_per_capita_income",
        "acs5_ts_median_earnings",
        "acs5_ts_health_insurance",
        "acs5_ts_housing_units",
        "qcew_employment_by_sector",
        "zoning_districts",
        "zoning_bylaws",
        "wastewater_service_areas",
        "wastewater_treatment_facilities",
        "wastewater_treatment_facility_permits",
        "wastewater_soil_suitability",
        "wastewater_stormwater_management",
        "cdc_places_county",
        "cdc_places_tract",
        "ambulance_service_areas",
        "acs5_dp",
        "flood_hazard",
    }
    assert set(DATASETS) == expected
    assert all(
        dataset.source_url.startswith("https://") for dataset in DATASETS.values()
    )
    assert all(
        "geometry" not in dataset.filter_columns for dataset in DATASETS.values()
    )


def test_availability_and_years_are_from_current_warehouse(warehouse):
    datasets = {row["dataset_id"]: row for row in list_datasets(warehouse)}
    demographics = datasets["acs5_demographics"]
    assert demographics["available"] is True
    assert (demographics["year_min"], demographics["year_max"]) == (2020, 2024)
    assert datasets["acs5_dp"]["available"] is False
    assert datasets["acs5_dp"]["year_max"] is None
    unavailable = describe_dataset(warehouse, "acs5_dp")
    assert unavailable["columns"] == []
    assert "absent" in unavailable["unavailable_reason"]
    description = describe_dataset(warehouse, "acs5_demographics")
    assert description["geo_types"] == ["state"]
    assert {row["name"] for row in description["columns"]} == {
        "year",
        "NAME",
        "geo_type",
        "Section",
        "Variable",
        "Value",
        "Percent",
    }


def test_catalog_search_is_case_insensitive_and_unknown_ids_rejected(warehouse):
    matches = list_datasets(warehouse, "MEDIAN AGE")
    assert [row["dataset_id"] for row in matches] == ["acs5_ts_median_age"]
    with pytest.raises(ValueError, match="Unknown dataset"):
        get_dataset("acs5_demographics; DROP TABLE acs5_demographics_tidy")


def test_variable_search_deduplicates_years_and_roundtrips(warehouse):
    rows = search_variables(warehouse, "acs5_demographics", query="population")
    assert len(rows) == 1
    assert rows[0]["selectors"] == {
        "Section": "Age/Sex",
        "Variable": "Population (ACS)",
    }
    assert rows[0]["value_columns"] == {"Value": "people", "Percent": "percent"}
    dataset = get_dataset("acs5_demographics")
    assert decode_variable_id(dataset, rows[0]["variable_id"]) == rows[0]["selectors"]
    assert (
        rows[0]["variable_id"]
        == search_variables(warehouse, "acs5_demographics", "POPULATION")[0][
            "variable_id"
        ]
    )
    assert search_variables(warehouse, "acs5_demographics", "'; DROP TABLE x; --") == []
    assert len(search_variables(warehouse, "acs5_demographics", limit=1)) == 1


def test_wide_metric_variable_id_and_units(warehouse):
    row = search_variables(warehouse, "acs5_ts_median_age")[0]
    assert row["selectors"] == {"$column": "Median_Age"}
    assert row["measures"] == [{"name": "Median_Age", "unit": "years"}]
    assert decode_variable_id(
        get_dataset("acs5_ts_median_age"), row["variable_id"]
    ) == {"$column": "Median_Age"}
    median = search_variables(warehouse, "acs5_demographics", "median")[0]
    assert median["value_columns"]["Value"] == "years"


def _encoded(payload):
    return "v1:" + base64.urlsafe_b64encode(
        json.dumps(payload).encode()
    ).decode().rstrip("=")


@pytest.mark.parametrize(
    "variable_id",
    [
        "plain_column",
        "v1:!!!",
        "v1:W10",
        "v2:abcdef",
        "v1:" + "x" * 17000,
        _encoded(
            {
                "dataset_id": "acs5_housing",
                "selectors": {"Section": "A", "Variable": "B"},
            }
        ),
        _encoded(
            {"dataset_id": "acs5_demographics", "selectors": {"Variable": "Population"}}
        ),
        _encoded(
            {
                "dataset_id": "acs5_demographics",
                "selectors": {
                    "Section": "Age/Sex",
                    "Variable": "Population",
                    "sql": "SELECT * FROM secrets",
                },
            }
        ),
        _encoded(
            {
                "dataset_id": "acs5_demographics",
                "selectors": {"Section": [], "Variable": "Population"},
            }
        ),
        _encoded(
            {
                "dataset_id": "acs5_demographics",
                "selectors": {"Section": "Age/Sex", "Variable": "x" * 2049},
            }
        ),
    ],
)
def test_invalid_cross_dataset_or_injected_variable_ids_rejected(variable_id):
    with pytest.raises(ValueError):
        decode_variable_id(get_dataset("acs5_demographics"), variable_id)


def test_wide_metric_rejects_unknown_or_unhashable_column():
    dataset = get_dataset("acs5_ts_median_age")
    for column in ("read_csv('/private/key')", [], None):
        with pytest.raises(ValueError):
            decode_variable_id(
                dataset, encode_variable_id(dataset, {"$column": column})
            )


def test_canonical_locations_keep_city_and_town_distinct(warehouse):
    locations = search_locations(warehouse, "St. Albans")
    assert {row["id"] for row in locations} == {"5001161675", "5001161750"}
    assert {row["geo_type"] for row in locations} == {"county_subdivision"}
    assert all(row["county"] == "50011" for row in locations)
    assert {row["name"] for row in locations} == {
        "St. Albans city, Franklin County, Vermont",
        "St. Albans town, Franklin County, Vermont",
    }
    county = search_locations(warehouse, "Chittenden", "county")
    assert [row["id"] for row in county] == ["50007"]
    tract = search_locations(warehouse, "50007003900")
    assert tract[0]["name"] == "Census Tract 39, Chittenden County, Vermont"
    assert tract[0]["id"] == tract[0]["location_id"] == tract[0]["geoid"]
    assert len({row["id"] for row in build_locations(warehouse)}) == len(
        build_locations(warehouse)
    )
    assert all(
        "st. albans" not in {alias.casefold() for alias in row["aliases"]}
        for row in locations
    )


def test_place_name_matches_rank_before_county_context(warehouse):
    warehouse.execute("""
        INSERT INTO vt_county_geoids VALUES ('Rutland County, Vermont', 50021);
        INSERT INTO vt_town_lines_geom VALUES
            ('5002161225', 'Rutland city'), ('5002161300', 'Rutland town'),
            ('5002183200', 'West Rutland town'), ('5002104525', 'Benson town');
        INSERT INTO vt_tract_lines_geom VALUES ('50021000100', 'Census Tract 1');
    """)
    results = search_locations(warehouse, "Rutland", limit=4)
    assert {row["id"] for row in results[:3]} == {"50021", "5002161225", "5002161300"}
    assert results[3]["name"].startswith("West Rutland")
    for row in results:
        if row["id"] in {"5002161225", "5002161300"}:
            assert "rutland" not in {alias.casefold() for alias in row["aliases"]}


def test_current_census_spelling_is_an_alias_for_boundary_geoid(warehouse):
    warehouse.execute("""
        INSERT INTO vt_town_lines_geom VALUES ('5001124050', 'Enosburgh town');
        INSERT INTO acs5_demographics_tidy VALUES
            ('2024', 'Enosburg town, Franklin County, Vermont', 'county_subdivision',
             'Age/Sex', 'Population (ACS)', 2800, NULL);
    """)
    place = search_locations(warehouse, "5001124050")[0]
    assert "Enosburg town, Franklin County, Vermont" in place["aliases"]


def test_historical_geoid_lookup_retains_full_name_and_merges_aliases(warehouse):
    warehouse.execute("""
        CREATE TABLE VCGI_historicPopulation_timeseries (
            geoid BIGINT, NAME VARCHAR, geo_type VARCHAR, Jurisdiction VARCHAR, County VARCHAR
        );
        INSERT INTO VCGI_historicPopulation_timeseries VALUES
            (5000710675, 'Burlington city, Chittenden County, Vermont', 'town',
             'Burlington city', 'Chittenden'),
            (5000739325, 'Historical place, Chittenden County, Vermont', 'town',
             'Historical place', 'Chittenden');
    """)
    assert len(search_locations(warehouse, "Burlington")) == 1
    historical = search_locations(warehouse, "Historical place")
    assert historical[0]["id"] == "5000739325"
    assert historical[0]["geo_type"] == "county_subdivision"


@pytest.mark.parametrize("limit", [0, -1, 201])
def test_discovery_limits_are_enforced(warehouse, limit):
    with pytest.raises(ValueError, match="limit"):
        search_variables(warehouse, "acs5_demographics", limit=limit)
    with pytest.raises(ValueError, match="limit"):
        search_locations(warehouse, limit=limit)


def test_missing_dataset_and_unknown_geography_fail_clearly(warehouse):
    with pytest.raises(ValueError, match="not available"):
        search_variables(warehouse, "cdc_places_county")
    with pytest.raises(ValueError, match="Unknown geography"):
        search_locations(warehouse, geo_type="zip")


def test_units_preserve_percentages_and_source_specific_estimates():
    dataset = get_dataset("acs5_dp")
    assert variable_units(dataset, {"Measure": "Percent Estimate"}) == {
        "Value": "percent"
    }
    assert "source-defined" in variable_units(dataset, {"Measure": "Estimate"})["Value"]
    assert get_dataset("zoning_bylaws").value_columns["F1F_Min_Lot_Size"] == "acres"
    assert get_dataset("acs5_ts_health_insurance").value_columns["Value"] == "people"
    assert "with a mortgage" in get_dataset("acs5_ts_income_burden").description
    economics = get_dataset("acs5_economics")
    assert variable_units(
        economics, {"Variable": "Labor Force Participation Rate (16+)"}
    ) == {"Value": "people", "Percent": "percent"}
    housing = get_dataset("acs5_housing")
    assert variable_units(housing, {"Variable": "Rental Vacancy Rate"}) == {
        "Value": "housing units",
        "Percent": "percent",
    }
    assert (
        "unavailable"
        in variable_units(economics, {"Variable": "Income below poverty"})["Value"]
    )


def test_location_index_requires_no_observation_tables():
    with duckdb.connect(":memory:") as conn:
        assert {row["id"] for row in build_locations(conn)} == {"US", "50"}
