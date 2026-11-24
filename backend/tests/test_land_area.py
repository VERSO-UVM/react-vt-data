"""
Tests for data_cleaning/clean_gazetteer.py: raw Gazetteer counties -> the 16
land-area rows (14 Vermont counties, Vermont, the United States) that
population density divides by.

The rows below are real values from the 2024 Gazetteer counties file:
https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2024_Gazetteer/2024_Gaz_counties_national.zip
Look one up with:  awk -F'\\t' '$1=="VT"' 2024_Gaz_counties_national.txt
"""

import pandas as pd
import pytest

from data_cleaning.clean_gazetteer import build_land_area

# USPS, GEOID, ALAND_SQMI (the other Gazetteer columns aren't used)
RAW = pd.DataFrame(
    [
        ("VT", "50001", 766.331),  # Addison
        ("VT", "50003", 674.237),  # Bennington
        ("VT", "50005", 649.213),  # Caledonia
        ("VT", "50007", 536.849),  # Chittenden
        ("VT", "50009", 662.370),  # Essex
        ("VT", "50011", 630.961),  # Franklin
        ("VT", "50013", 81.770),  # Grand Isle
        ("VT", "50015", 461.255),  # Lamoille
        ("VT", "50017", 687.008),  # Orange
        ("VT", "50019", 694.552),  # Orleans
        ("VT", "50021", 930.552),  # Rutland
        ("VT", "50023", 687.060),  # Washington
        ("VT", "50025", 785.959),  # Windham
        ("VT", "50027", 969.144),  # Windsor
        # Another state: counts toward the US only. The leading zero must stay.
        ("AL", "01001", 594.455),  # Autauga County, Alabama
        # Puerto Rico: ACS "United States" excludes it, so the US total must too
        ("PR", "72001", 66.683),  # Adjuntas Municipio
    ],
    columns=["USPS", "GEOID", "ALAND_SQMI"],
)

# Sum of the 14 Vermont rows above (also the full-file Vermont total)
VT_TOTAL = 9217.261


def _expect(got, expected, what):
    __tracebackhide__ = True
    if got != expected:
        pytest.fail(f"{what}\nExpected: {expected}\nGot:      {got}", pytrace=False)


def _land(df, geo_type, geoid=None):
    """land_sqmi for one row, rounded so float sums compare cleanly."""
    if geoid is None:
        row = df[df["geo_type"] == geo_type]
    else:
        row = df[(df["geo_type"] == geo_type) & (df["geoid"] == geoid)]
    return round(float(row["land_sqmi"].iloc[0]), 3)


def test_one_row_per_county_plus_vermont_and_us():
    counts = build_land_area(RAW)["geo_type"].value_counts().to_dict()
    _expect(
        counts,
        {"county": 14, "state": 1, "national": 1},
        "land_area: rows per geo_type",
    )


def test_columns_match_the_density_join():
    _expect(
        list(build_land_area(RAW).columns),
        ["geoid", "geo_type", "land_sqmi"],
        "land_area: columns",
    )


def test_essex_land_area():
    _expect(_land(build_land_area(RAW), "county", "50009"), 662.37, "Essex land sq mi")


def test_only_vermont_counties_are_kept():
    counties = build_land_area(RAW).query("geo_type == 'county'")
    others = sorted(g for g in counties["geoid"] if not g.startswith("50"))
    _expect(others, [], "land_area: non-Vermont counties")


def test_vermont_is_the_sum_of_its_counties():
    df = build_land_area(RAW)
    _expect(_land(df, "state", "50"), VT_TOTAL, "Vermont land sq mi (geoid '50')")


def test_us_total_excludes_puerto_rico():
    # Vermont + Alabama's Autauga; Adjuntas (PR) left out
    expected = round(VT_TOTAL + 594.455, 3)
    _expect(_land(build_land_area(RAW), "national"), expected, "US land sq mi")


def test_us_geoid_is_null_like_the_warehouse():
    # SELECT geoid FROM acs5_dp_combined_tidy WHERE geo_type = 'national'
    # -> NULL, so land_area's US row must be NULL too for the join to match.
    us = build_land_area(RAW).query("geo_type == 'national'")
    _expect(us["geoid"].isna().tolist(), [True], "US geoid is null")
