"""Zoning names, raw identifier defects and overlay accounting stay explicit."""

from types import SimpleNamespace

import duckdb
import pytest

from data_tools import catalog
from data_tools.zoning import (
    resolve_zoning_locations,
    zoning_location_id,
    zoning_summary,
)


@pytest.fixture
def inventory():
    conn = duckdb.connect(":memory:")
    conn.execute("CREATE TABLE vt_county_geoids(NAME VARCHAR, GEOID VARCHAR)")
    conn.execute(
        "INSERT INTO vt_county_geoids VALUES "
        "('Chittenden County, Vermont', '50007'), "
        "('Franklin County, Vermont', '50011'), "
        "('Rutland County, Vermont', '50021'), "
        "('Lamoille County, Vermont', '50015')"
    )
    conn.execute("CREATE TABLE vt_town_lines_geom(FIPS_ID VARCHAR, TOWN_NAME VARCHAR)")
    conn.execute(
        "INSERT INTO vt_town_lines_geom VALUES "
        "('5000710675', 'Burlington city'), "
        "('5000766175', 'South Burlington city'), "
        "('5001161675', 'St. Albans city'), "
        "('5001161750', 'St. Albans town'), "
        "('5002161225', 'Rutland city'), "
        "('5002161300', 'Rutland town'), "
        "('5001570525', 'Stowe town')"
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
                1,
                "Rutland",
                "Rutland City",
                "5002161300",
                "City district",
                "Residential",
                "No",
                100,
            ),
            (
                2,
                "Rutland",
                "Rutland Town",
                "5002161300",
                "Town district",
                "Residential",
                "No",
                200,
            ),
            (
                3,
                "Franklin",
                "Saint Albans City",
                "5001161750",
                "City district",
                "Residential",
                "No",
                300,
            ),
            (
                4,
                "Franklin",
                "Saint Albans Town",
                "5001161750",
                "Town district",
                "Residential",
                "No",
                400,
            ),
            (
                5,
                "Chittenden",
                "South Burlington",
                None,
                "Null ID district",
                "Residential",
                "No",
                500,
            ),
            (
                6,
                "Lamoille",
                "Stowe Town Stowe Village",
                None,
                "Combined name",
                "Residential",
                "No",
                600,
            ),
            (
                7,
                "Chittenden",
                "Burlington",
                "5000710675",
                "Base district",
                "Residential",
                "No",
                700,
            ),
            (
                8,
                "Chittenden",
                "Burlington",
                "5000710675",
                "Residential high density",
                "Residential",
                "Yes",
                86.1,
            ),
            (
                9,
                "Chittenden",
                "Burlington",
                "5000710675",
                "Unknown acres overlay",
                "Overlay",
                "Yes",
                None,
            ),
            (
                10,
                "Rutland",
                "Rutland City",
                "5002161300",
                "City overlay",
                "Overlay",
                "Yes",
                10,
            ),
            (
                11,
                "Rutland",
                "Rutland Town",
                "5002161300",
                "Town overlay",
                "Overlay",
                "Yes",
                20,
            ),
        ],
    )
    conn.execute("CREATE TABLE VersoZoning_wide AS SELECT * FROM VersoZoning_info")
    conn.execute("UPDATE VersoZoning_wide SET town = town || ' '")
    yield conn
    conn.close()


def request(**changes):
    return SimpleNamespace(
        **(
            {
                "municipality": None,
                "location_id": None,
                "county": None,
                "include_overlays": False,
            }
            | changes
        )
    )


def places(conn, *ids):
    return [place for place in catalog.build_locations(conn) if place["id"] in ids]


@pytest.mark.parametrize("table", ["VersoZoning_info", "VersoZoning_wide"])
def test_city_selection_uses_names_and_preserves_wrong_source_id(inventory, table):
    clause, params, diagnostics = resolve_zoning_locations(
        inventory, places(inventory, "5002161225"), table=table
    )
    rows = inventory.execute(
        f'SELECT town, geoid FROM "{table}" WHERE {clause}', params
    ).fetchall()
    assert len(rows) == 2
    assert {name.strip() for name, _ in rows} == {"Rutland City"}
    assert {geoid for _, geoid in rows} == {"5002161300"}
    assert diagnostics["mismatched_source_geoid_count"] == 2
    for name, geoid in rows:
        source = {"town": name, "geoid": geoid}
        assert zoning_location_id(source, diagnostics) == "5002161225"
        assert source["geoid"] == "5002161300"


def test_town_does_not_take_city_districts_with_same_source_geoid(inventory):
    clause, params, diagnostics = resolve_zoning_locations(
        inventory, places(inventory, "5001161750")
    )
    rows = inventory.execute(
        f"SELECT town FROM VersoZoning_info WHERE {clause}", params
    ).fetchall()
    assert rows == [("Saint Albans Town",)]
    assert diagnostics["conflicting_geoid_districts_excluded"] == 1


def test_missing_source_geoid_can_resolve_from_unambiguous_name(inventory):
    clause, params, diagnostics = resolve_zoning_locations(
        inventory, places(inventory, "5000766175")
    )
    row = inventory.execute(
        f"SELECT town,geoid FROM VersoZoning_info WHERE {clause}", params
    ).fetchone()
    assert row == ("South Burlington", None)
    assert diagnostics["missing_source_geoid_count"] == 1


def test_concatenated_source_name_is_not_assigned_to_a_single_town(inventory):
    clause, params, diagnostics = resolve_zoning_locations(
        inventory, places(inventory, "5001570525")
    )
    assert (
        inventory.execute(
            f"SELECT count(*) FROM VersoZoning_info WHERE {clause}", params
        ).fetchone()[0]
        == 0
    )
    assert any(
        item["town"] == "Stowe Town Stowe Village"
        for item in diagnostics["inventory_unresolved_names_preview"]
    )


def test_summary_aliases_match_census_and_inventory_spelling(inventory):
    result = zoning_summary(inventory, request(municipality="St.Albanscity"), 100)
    assert result["rows"][0]["town"] == "Saint Albans City"
    assert result["rows"][0]["recorded_acres"] == 300
    assert result["resolved_locations"][0]["id"] == "5001161675"
    assert result["location_diagnostics"]["mismatched_source_geoid_count"] == 1


def test_ambiguous_municipality_requires_explicit_city_or_town(inventory):
    with pytest.raises(ValueError, match=r"Ambiguous.*5002161225.*5002161300"):
        zoning_summary(inventory, request(municipality="Rutland"), 100)
    result = zoning_summary(inventory, request(municipality="Rutland City"), 100)
    assert {row["town"] for row in result["rows"]} == {"Rutland City"}


def test_explicit_location_and_alias_must_agree(inventory):
    result = zoning_summary(inventory, request(location_id="5002161225"), 100)
    assert result["rows"][0]["recorded_acres"] == 100
    with pytest.raises(ValueError, match="different places"):
        zoning_summary(
            inventory,
            request(location_id="5002161225", municipality="Rutland Town"),
            100,
        )


def test_excluded_overlay_totals_reconcile_without_correcting_source_flags(inventory):
    result = zoning_summary(inventory, request(municipality="Burlington"), 100)
    assert sum(row["district_count"] for row in result["rows"]) == 1
    excluded = result["excluded_overlays"]
    assert excluded["district_count"] == 2
    assert excluded["recorded_acres"] == 86.1
    assert excluded["districts_missing_acres"] == 1
    assert {row["district_name"] for row in excluded["districts_preview"]} == {
        "Residential high density",
        "Unknown acres overlay",
    }
    # Reporting the disputed source flag is allowed; changing it is not.
    assert (
        inventory.execute(
            "SELECT Overlay_District FROM VersoZoning_info WHERE OBJECT_ID=8"
        ).fetchone()[0]
        == "Yes"
    )


def test_overlay_totals_respect_municipality_county_and_include_flag(inventory):
    result = zoning_summary(
        inventory,
        request(municipality="Rutland City", county="Rutland County, Vermont"),
        100,
    )
    assert result["excluded_overlays"]["district_count"] == 1
    assert result["excluded_overlays"]["recorded_acres"] == 10
    result = zoning_summary(
        inventory, request(municipality="Rutland City", county="Franklin"), 100
    )
    assert result["rows"] == []
    assert result["excluded_overlays"]["district_count"] == 0
    result = zoning_summary(
        inventory, request(municipality="Rutland City", include_overlays=True), 100
    )
    assert sum(row["district_count"] for row in result["rows"]) == 2
    assert result["excluded_overlays"]["district_count"] == 0


def test_overlay_preview_is_bounded_and_totals_do_not_depend_on_pagination(inventory):
    inventory.executemany(
        "INSERT INTO VersoZoning_info VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [
            (
                100 + i,
                "Chittenden",
                "Burlington",
                "5000710675",
                f"Overlay {i}",
                "Overlay",
                "Yes",
                1,
            )
            for i in range(25)
        ],
    )
    first = zoning_summary(inventory, request(), 1)
    second = zoning_summary(inventory, request(), 1, offset=1)
    excluded = first["excluded_overlays"]
    assert excluded == second["excluded_overlays"]
    assert excluded["district_count"] == 29
    assert excluded["recorded_acres"] == 141.1
    assert len(excluded["districts_preview"]) == 20
    assert excluded["preview_truncated"]
    assert first["has_more"]


def test_no_location_match_never_falls_back_to_whole_state(inventory):
    result = zoning_summary(inventory, request(municipality="Atlantis"), 100)
    assert result["rows"] == []
    assert result["excluded_overlays"]["district_count"] == 0


def test_partial_inventory_exact_name_does_not_invent_a_canonical_id(inventory):
    inventory.execute("DROP TABLE vt_town_lines_geom")
    result = zoning_summary(inventory, request(municipality="Rutland City"), 100)
    assert result["rows"][0]["town"] == "Rutland City"
    assert result["resolved_locations"] == []
    assert "unresolved" in result["location_diagnostics"]["strategy"]


def test_table_names_are_allowlisted(inventory):
    with pytest.raises(ValueError, match="Unsupported"):
        resolve_zoning_locations(
            inventory, [], table="VersoZoning_info; DROP TABLE vt_county_geoids"
        )


def test_county_summary_location_diagnostics_match_the_county_scope(inventory):
    result = zoning_summary(
        inventory, request(county="Chittenden County, Vermont"), 100
    )
    diagnostics = result["location_diagnostics"]
    assert diagnostics["inventory_county_scope"] == "Chittenden"
    assert diagnostics["matched_district_count"] == 4
    assert diagnostics["missing_source_geoid_count"] == 1
    assert diagnostics["mismatched_source_geoid_count"] == 0
    assert diagnostics["inventory_unresolved_district_count"] == 0
    assert diagnostics["matched_district_count"] == (
        sum(row["district_count"] for row in result["rows"])
        + result["excluded_overlays"]["district_count"]
    )
    assert "not counts of the returned page" in diagnostics["scope_note"]


def test_county_scope_applies_to_canonical_predicate_and_unresolved_counts(inventory):
    clause, params, diagnostics = resolve_zoning_locations(
        inventory,
        [
            place
            for place in catalog.build_locations(inventory)
            if place["geo_type"] == "county_subdivision"
        ],
        county="Franklin County",
    )
    assert inventory.execute(
        f"SELECT DISTINCT County FROM VersoZoning_info WHERE {clause}", params
    ).fetchall() == [("Franklin",)]
    assert diagnostics["matched_district_count"] == 2
    assert diagnostics["mismatched_source_geoid_count"] == 1
    assert diagnostics["inventory_unresolved_district_count"] == 0
    diagnostics = zoning_summary(inventory, request(county="Lamoille"), 100)[
        "location_diagnostics"
    ]
    assert diagnostics["matched_district_count"] == 0
    assert diagnostics["inventory_unresolved_district_count"] == 1


def test_location_and_wrong_county_have_empty_scoped_diagnostics(inventory):
    result = zoning_summary(
        inventory, request(location_id="5002161225", county="Chittenden"), 100
    )
    assert result["rows"] == []
    assert result["location_diagnostics"]["matched_district_count"] == 0
    assert result["location_diagnostics"]["mismatched_source_geoid_count"] == 0
