"""
Tests for the housing cost burden cleaner, run against small in-memory DP04
fixtures instead of the DuckLake.
"""

import duckdb
import pandas as pd
import pytest

from data_cleaning.clean_housing_cost_burden import (
    ALL_HOUSEHOLDS,
    TENURES,
    build_burden,
)

RENT, MORTGAGE, NO_MORTGAGE = TENURES.keys()


def rows(year, name, subcategory, low, high, total, measure="Estimate"):
    """DP04 rows for one tenure: the two burden brackets and the total."""
    return [
        (year, name, "county_subdivision", subcategory, variable, measure, value)
        for variable, value in [
            ("30.0 to 34.9 percent", low),
            ("35.0 percent or more", high),
            ("Total", total),
        ]
    ]


def complete_place(year, name):
    return (
        rows(year, name, RENT, "10", "30", "100")
        + rows(year, name, MORTGAGE, "5", "15", "80")
        + rows(year, name, NO_MORTGAGE, "2", "3", "50")
    )


def run(raw_rows):
    con = duckdb.connect()
    con.execute(
        """
        CREATE TABLE raw (
            year BIGINT, NAME VARCHAR, geo_type VARCHAR, Subcategory VARCHAR,
            Variable VARCHAR, Measure VARCHAR, Value VARCHAR
        )
        """
    )
    con.executemany("INSERT INTO raw VALUES (?, ?, ?, ?, ?, ?, ?)", raw_rows)
    df = build_burden(con, source="raw")
    return df.set_index(["year", "NAME", "Variable"])


def value(df, year, name, variable, column="Percent"):
    result = df.loc[(year, name, variable), column]
    return None if pd.isna(result) else result


def test_rates_by_tenure_and_all_households():
    df = run(complete_place(2020, "A"))

    assert value(df, 2020, "A", "Renters") == 40.0
    assert value(df, 2020, "A", "Owners with a mortgage") == 25.0
    assert value(df, 2020, "A", "Owners without a mortgage") == 10.0
    # All households is summed from counts, not averaged: 65 / 230.
    assert value(df, 2020, "A", ALL_HOUSEHOLDS, "Value") == 65
    assert value(df, 2020, "A", ALL_HOUSEHOLDS, "Total") == 230
    assert value(df, 2020, "A", ALL_HOUSEHOLDS) == 28.3


def test_percent_estimate_years_are_included():
    # 2017-2018 label percentages 'Percent Estimate'; the count rows the
    # cleaner reads are still 'Estimate', so those years must not drop out.
    raw = complete_place(2017, "A") + [
        (
            2017,
            "A",
            "county_subdivision",
            RENT,
            "35.0 percent or more",
            "Percent Estimate",
            "30.0",
        ),
    ]
    df = run(raw)

    assert value(df, 2017, "A", "Renters") == 40.0


def test_percent_rows_and_early_years_are_ignored():
    raw = (
        complete_place(2020, "A")
        + [
            (
                2020,
                "A",
                "county_subdivision",
                RENT,
                "35.0 percent or more",
                "Percent",
                "99.9",
            ),
        ]
        + complete_place(2012, "A")
    )
    df = run(raw)

    assert value(df, 2020, "A", "Renters") == 40.0
    assert 2012 not in df.index.get_level_values("year")


@pytest.mark.parametrize("sentinel", ["-666666666", "-666666666.0", "(X)", "N"])
def test_one_missing_component_makes_the_rate_missing(sentinel):
    raw = (
        rows(2020, "A", RENT, sentinel, "30", "100")
        + rows(2020, "A", MORTGAGE, "5", "15", "80")
        + rows(2020, "A", NO_MORTGAGE, "2", "3", "50")
    )
    df = run(raw)

    assert value(df, 2020, "A", "Renters") is None
    assert value(df, 2020, "A", "Renters", "Value") is None
    # An incomplete tenure makes the all-households total incomplete too.
    assert value(df, 2020, "A", ALL_HOUSEHOLDS) is None
    assert value(df, 2020, "A", "Owners with a mortgage") == 25.0


def test_two_missing_components_are_not_summed_into_a_value():
    # The old cleaner summed two -666666666 sentinels into -1333333332.
    raw = (
        rows(2020, "A", RENT, "10", "30", "100")
        + rows(2020, "A", MORTGAGE, "-666666666", "-666666666", "80")
        + rows(2020, "A", NO_MORTGAGE, "2", "3", "50")
    )
    df = run(raw)

    assert value(df, 2020, "A", "Owners with a mortgage", "Value") is None
    assert (df["Value"].dropna() >= 0).all()


def test_missing_total_makes_the_rate_missing():
    raw = (
        rows(2020, "A", RENT, "10", "30", "-888888888")
        + rows(2020, "A", MORTGAGE, "5", "15", "80")
        + rows(2020, "A", NO_MORTGAGE, "2", "3", "50")
    )
    df = run(raw)

    assert value(df, 2020, "A", "Renters") is None
    assert value(df, 2020, "A", ALL_HOUSEHOLDS) is None


def test_real_zero_is_kept_and_zero_universe_has_no_rate():
    raw = (
        rows(2020, "A", RENT, "0", "0", "100")
        + rows(2020, "A", MORTGAGE, "0", "0", "0")
        + rows(2020, "A", NO_MORTGAGE, "2", "3", "50")
    )
    df = run(raw)

    assert value(df, 2020, "A", "Renters") == 0.0
    assert value(df, 2020, "A", "Owners with a mortgage") is None
    assert value(df, 2020, "A", "Owners with a mortgage", "Total") == 0
    # A tenure with no households still contributes to the total: 5 / 150.
    assert value(df, 2020, "A", ALL_HOUSEHOLDS) == 3.3


def test_duplicate_rows_are_not_double_counted():
    raw = complete_place(2020, "A") + rows(2020, "A", RENT, "10", "30", "100")
    df = run(raw)

    assert value(df, 2020, "A", "Renters") is None
    assert value(df, 2020, "A", ALL_HOUSEHOLDS) is None


def test_rates_are_rounded_to_one_decimal():
    raw = (
        rows(2020, "A", RENT, "1", "0", "3")
        + rows(2020, "A", MORTGAGE, "5", "15", "80")
        + rows(2020, "A", NO_MORTGAGE, "2", "3", "50")
    )
    df = run(raw)

    assert value(df, 2020, "A", "Renters") == 33.3
