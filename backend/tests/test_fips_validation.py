"""Tests for data_collection.fips validation.

Each test starts from the boundary files committed in Data/vermont/ (the same
files collect() downloads from GitHub), breaks one thing, and checks that the
right check catches it.
"""

import geopandas as gpd
import pandas as pd
import pytest
from pyogrio import read_dataframe
from shapely.geometry import Point, Polygon, box

from data_collection import fips

LOCAL_FILES = {
    "vt_county_lines": "Data/vermont/countyLines.geojson",
    "vt_town_lines": "Data/vermont/municipalities.json",
    "vt_tract_lines": "Data/vermont/cb_2025_50_tract_500k/cb_2025_50_tract_500k.shp",
}

# A self-intersecting "bowtie": a non-empty polygon that is not valid.
BOWTIE = Polygon([(-72.5, 44.0), (-72.4, 44.1), (-72.4, 44.0), (-72.5, 44.1)])


@pytest.fixture(scope="module")
def _loaded() -> dict[str, gpd.GeoDataFrame]:
    return {name: read_dataframe(path) for name, path in LOCAL_FILES.items()}


@pytest.fixture
def tables(_loaded) -> dict[str, gpd.GeoDataFrame]:
    """Fresh copies of the committed tables, safe to modify."""
    return {name: df.copy() for name, df in _loaded.items()}


def assert_problem(problems: list[str], expected: str) -> None:
    """Fail unless `expected` is exactly one of the problems.

    Messages follow the pattern "<table>: <what is wrong>: <values>".
    """
    __tracebackhide__ = True  # report the failure at the test's line
    if expected not in problems:
        got = "\n".join(f"  {p!r}" for p in problems) or "  (no problems)"
        pytest.fail(f"Expected:\n  {expected!r}\nGot:\n{got}", pytrace=False)


# ---------------------------------------------------------------------------
# The committed files pass
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("name", list(LOCAL_FILES))
def test_committed_tables_pass_every_per_table_check(tables, name):
    df = tables[name]
    assert fips.check_schema(name, df) == []
    assert fips.check_row_count(name, df) == []
    assert fips.check_ids(name, df) == []
    assert fips.check_geometry(name, df) == []


def test_committed_counties_pass_county_check(tables):
    assert fips.check_counties(tables["vt_county_lines"]) == []


def test_committed_tables_nest(tables):
    assert fips.check_nesting(tables) == []


def test_committed_tables_pass_validate(tables):
    fips.validate(tables)  # does not raise


# ---------------------------------------------------------------------------
# check_schema
# ---------------------------------------------------------------------------


def test_schema_missing_column(tables):
    df = tables["vt_county_lines"].drop(columns="CNTYNAME")
    assert_problem(
        fips.check_schema("vt_county_lines", df),
        "vt_county_lines: missing column: CNTYNAME",
    )


def test_schema_extra_column(tables):
    df = tables["vt_town_lines"].assign(SURPRISE=1)
    assert_problem(
        fips.check_schema("vt_town_lines", df),
        "vt_town_lines: unexpected column: SURPRISE",
    )


def test_schema_renamed_column(tables):
    df = tables["vt_tract_lines"].rename(columns={"GEOID": "GEOID20"})
    problems = fips.check_schema("vt_tract_lines", df)
    assert_problem(problems, "vt_tract_lines: missing column: GEOID")
    assert_problem(problems, "vt_tract_lines: unexpected column: GEOID20")


def test_schema_id_read_as_number(tables):
    # A numeric ID would drop leading zeros
    df = tables["vt_county_lines"]
    df["CNTYGEOID"] = df["CNTYGEOID"].astype(int)
    assert_problem(
        fips.check_schema("vt_county_lines", df),
        "vt_county_lines: CNTYGEOID should be str, got int64",
    )


def test_schema_int_read_as_string(tables):
    df = tables["vt_county_lines"]
    df["CNTY"] = df["CNTY"].astype(str)
    assert_problem(
        fips.check_schema("vt_county_lines", df),
        "vt_county_lines: CNTY should be int, got str",
    )


# ---------------------------------------------------------------------------
# check_row_count
# ---------------------------------------------------------------------------


def test_row_count_too_few(tables):
    df = tables["vt_town_lines"].iloc[:-1]
    assert_problem(
        fips.check_row_count("vt_town_lines", df),
        "vt_town_lines: expected 256 rows, got 255",
    )


def test_row_count_too_many(tables):
    df = tables["vt_county_lines"]
    df = pd.concat([df, df.iloc[[0]]], ignore_index=True)  # one duplicated row
    assert_problem(
        fips.check_row_count("vt_county_lines", df),
        "vt_county_lines: expected 14 rows, got 15",
    )


# ---------------------------------------------------------------------------
# check_ids
# ---------------------------------------------------------------------------


def test_ids_null(tables):
    df = tables["vt_town_lines"]
    df.loc[0, "GEOID"] = None
    assert_problem(
        fips.check_ids("vt_town_lines", df), "vt_town_lines: GEOID has nulls"
    )


def test_ids_duplicate(tables):
    df = tables["vt_tract_lines"]
    df.loc[1, "GEOID"] = df.loc[0, "GEOID"]
    assert_problem(
        fips.check_ids("vt_tract_lines", df),
        "vt_tract_lines: GEOID has duplicates: 50007003900",
    )


def test_ids_wrong_length(tables):
    df = tables["vt_county_lines"]
    df.loc[0, "CNTYGEOID"] = "5001"
    assert_problem(
        fips.check_ids("vt_county_lines", df),
        "vt_county_lines: CNTYGEOID badly formatted: 5001",
    )


def test_ids_not_digits(tables):
    df = tables["vt_town_lines"]
    df.loc[0, "GEOID"] = "50027ABCDE"
    assert_problem(
        fips.check_ids("vt_town_lines", df),
        "vt_town_lines: GEOID badly formatted: 50027ABCDE",
    )


def test_ids_wrong_state(tables):
    # New Hampshire's state FIPS is 33: the wrong state's file was committed
    df = tables["vt_county_lines"]
    df.loc[0, "CNTYGEOID"] = "33001"
    assert_problem(
        fips.check_ids("vt_county_lines", df),
        "vt_county_lines: CNTYGEOID badly formatted: 33001",
    )


# ---------------------------------------------------------------------------
# check_geometry
# ---------------------------------------------------------------------------


def test_geometry_no_crs(tables):
    df = tables["vt_tract_lines"]
    df.geometry.values.crs = None
    assert_problem(
        fips.check_geometry("vt_tract_lines", df), "vt_tract_lines: no CRS declared"
    )


def test_geometry_null(tables):
    df = tables["vt_town_lines"]
    df.loc[0, "geometry"] = None
    assert_problem(
        fips.check_geometry("vt_town_lines", df),
        "vt_town_lines: null geometry: 5002784925",
    )


def test_geometry_empty(tables):
    df = tables["vt_town_lines"]
    df.loc[0, "geometry"] = Polygon()
    assert_problem(
        fips.check_geometry("vt_town_lines", df),
        "vt_town_lines: empty geometry: 5002784925",
    )


def test_geometry_invalid(tables):
    df = tables["vt_county_lines"]
    df.loc[0, "geometry"] = BOWTIE
    assert_problem(
        fips.check_geometry("vt_county_lines", df),
        "vt_county_lines: invalid geometry: 50019",
    )


def test_geometry_wrong_type(tables):
    df = tables["vt_county_lines"]
    df.loc[0, "geometry"] = Point(-72.5, 44.0)
    assert_problem(
        fips.check_geometry("vt_county_lines", df),
        "vt_county_lines: geometry is not a Polygon or MultiPolygon: 50019",
    )


def test_geometry_outside_vermont(tables):
    df = tables["vt_county_lines"]
    df.loc[0, "geometry"] = box(-100.0, 30.0, -99.0, 31.0)  # Texas
    assert_problem(
        fips.check_geometry("vt_county_lines", df),
        "vt_county_lines: geometry outside Vermont: 50019",
    )


def test_geometry_lat_lon_swapped(tables):
    df = tables["vt_county_lines"]
    df.loc[0, "geometry"] = box(44.0, -73.0, 44.1, -72.9)
    assert_problem(
        fips.check_geometry("vt_county_lines", df),
        "vt_county_lines: geometry outside Vermont: 50019",
    )


# ---------------------------------------------------------------------------
# check_counties
# ---------------------------------------------------------------------------


def test_counties_unknown_name(tables):
    df = tables["vt_county_lines"]
    df.loc[0, "CNTYNAME"] = "GOTHAM"
    assert_problem(
        fips.check_counties(df), "vt_county_lines: unknown county name: GOTHAM"
    )


def test_counties_lowercase_name(tables):
    df = tables["vt_county_lines"]
    df.loc[0, "CNTYNAME"] = df.loc[0, "CNTYNAME"].title()
    assert_problem(
        fips.check_counties(df), "vt_county_lines: unknown county name: Orleans"
    )


def test_counties_geoid_disagrees_with_cnty(tables):
    df = tables["vt_county_lines"]
    df.loc[0, "CNTY"] = df.loc[0, "CNTY"] + 2  # 19 -> 21
    assert_problem(
        fips.check_counties(df),
        "vt_county_lines: CNTYGEOID does not match CNTY: 50019",
    )


# ---------------------------------------------------------------------------
# check_nesting
# ---------------------------------------------------------------------------


def test_nesting_town_in_unknown_county(tables):
    # 50099 has the right shape and state, but no such county exists
    tables["vt_town_lines"].loc[0, "GEOID"] = "5009984925"
    assert_problem(
        fips.check_nesting(tables),
        "vt_town_lines: GEOID in unknown county: 5009984925",
    )


def test_nesting_tract_in_unknown_county(tables):
    tables["vt_tract_lines"].loc[0, "GEOID"] = "50099003900"
    assert_problem(
        fips.check_nesting(tables),
        "vt_tract_lines: GEOID in unknown county: 50099003900",
    )


# ---------------------------------------------------------------------------
# validate
# ---------------------------------------------------------------------------


def test_validate_raises_on_any_failure(tables):
    tables["vt_town_lines"] = tables["vt_town_lines"].iloc[:-1]
    with pytest.raises(fips.FipsValidationError):
        fips.validate(tables)


def test_validate_reports_every_problem_at_once(tables):
    # Two unrelated problems in two tables: both show up in one error
    tables["vt_town_lines"] = tables["vt_town_lines"].iloc[:-1]
    tables["vt_county_lines"].loc[0, "CNTYNAME"] = "GOTHAM"
    with pytest.raises(fips.FipsValidationError) as exc:
        fips.validate(tables)
    assert "vt_town_lines" in str(exc.value)
    assert "GOTHAM" in str(exc.value)


def test_validate_missing_table(tables):
    del tables["vt_tract_lines"]
    with pytest.raises(fips.FipsValidationError, match="vt_tract_lines"):
        fips.validate(tables)


# ---------------------------------------------------------------------------
# collect
# ---------------------------------------------------------------------------


def _stub_fetches(monkeypatch, tables):
    monkeypatch.setattr(fips, "fetch_counties", lambda: tables["vt_county_lines"])
    monkeypatch.setattr(fips, "fetch_towns", lambda: tables["vt_town_lines"])
    monkeypatch.setattr(fips, "fetch_tracts", lambda: tables["vt_tract_lines"])


def test_collect_returns_valid_tables(monkeypatch, tables):
    _stub_fetches(monkeypatch, tables)
    assert set(fips.collect()) == set(LOCAL_FILES)


def test_collect_raises_before_returning_bad_data(monkeypatch, tables):
    # So run_scraper never reaches replace_table and the old RAW table stays
    tables["vt_town_lines"] = tables["vt_town_lines"].iloc[:-1]
    _stub_fetches(monkeypatch, tables)
    with pytest.raises(fips.FipsValidationError):
        fips.collect()
