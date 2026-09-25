"""
Tests for query/dp_variable_names.py, the readable names for Census DP
variables whose labels repeat within a year (issue #106).
"""

from itertools import pairwise

import pandas as pd

from query.dp_variable_names import NAMES_CSV, add_variable_names, variable_name


def test_names_estimate_and_percent_codes_alike():
    assert variable_name("DP04_0100E", 2011) == "With a mortgage"
    assert variable_name("DP04_0100PE", 2011) == "With a mortgage"
    assert variable_name("DP04_0107E", 2012) == "Without a mortgage"


def test_names_only_within_the_listed_years():
    # DP04_0114 is "Not computed" (with a mortgage) through 2014, then Census
    # renumbered: from 2015 it's a percentage bin, and 0116 is "Not computed".
    assert variable_name("DP04_0114E", 2014) == "With a mortgage"
    assert variable_name("DP04_0114E", 2015) is None
    assert variable_name("DP04_0116E", 2015) == "With a mortgage"


def test_unlisted_or_missing_codes_have_no_name():
    assert variable_name("DP05_0001E", 2020) is None
    assert variable_name(None, 2020) is None


def test_add_variable_names_adds_a_column():
    rows = pd.DataFrame(
        {"year": [2011, 2013], "variable_code": ["DP04_0100E", "DP04_0100E"]}
    )
    assert add_variable_names(rows)["variable_name"].tolist() == [
        "With a mortgage",
        None,
    ]


def test_csv_ranges_are_valid_and_do_not_overlap():
    names = pd.read_csv(NAMES_CSV)
    assert list(names.columns) == ["variable", "first_year", "last_year", "name"]
    assert (names["first_year"] <= names["last_year"]).all()
    assert not names["variable"].str.contains(r"(?:PE|PM|E|M)$").any()
    for _, group in names.groupby("variable"):
        spans = sorted(zip(group["first_year"], group["last_year"], strict=True))
        for (_, end), (start, _) in pairwise(spans):
            assert start > end, f"overlapping years for {group['variable'].iloc[0]}"
