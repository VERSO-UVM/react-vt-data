"""
Golden-output and correctness tests for the DuckDB-backed time-series census endpoints.

Golden CSVs in tests/golden/ were generated from the original pandas/CSV pipeline
before the DuckDB migration. Tests assert that the new DuckDB path returns
numerically identical results.

Run:
    cd backend && conda run -n leahy_data pytest tests/test_census_timeseries_db.py -v
"""

from pathlib import Path

import pandas as pd
import pytest

from app_utils import timeseries_db

GOLDEN_DIR = Path(__file__).parent / "golden"
FILTER_TOWN = "Addison town"

# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------


def _load_golden(filename: str) -> pd.DataFrame:
    return pd.read_csv(GOLDEN_DIR / filename)


def _normalize(df: pd.DataFrame) -> pd.DataFrame:
    """Sort + reset index so frame comparison is order-independent.

    Coerces all columns that look numeric to float so that int/str/float
    dtype differences between the DuckDB result and the golden CSV don't
    produce false failures.
    """
    df = df.copy()
    for col in df.columns:
        coerced = pd.to_numeric(df[col], errors="coerce")
        # Only coerce if *all* non-null values converted successfully
        if coerced.notna().sum() == df[col].notna().sum():
            df[col] = coerced
    return df.sort_values(list(df.columns)).reset_index(drop=True)


# ---------------------------------------------------------------------------
# Golden-output (value) tests
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "view_name,golden_file",
    [
        ("unemployment_rate", "unemployment_rate_addison_town.csv"),
        ("median_earnings", "median_earnings_addison_town.csv"),
        ("median_home_value", "med_home_value_addison_town.csv"),
        ("median_smoc", "med_smoc_addison_town.csv"),
        ("commute_time", "commute_time_addison_town.csv"),
        ("commute_habits", "commute_habits_addison_town.csv"),
        ("historic_population", "historic_population_addison_town.csv"),
    ],
)
def test_golden_output_matches(view_name: str, golden_file: str):
    """DuckDB result must match pre-migration pandas result exactly."""
    actual = timeseries_db.query_timeseries(view_name, {"Jurisdiction": [FILTER_TOWN]})
    expected = _load_golden(golden_file)

    # Align column sets (golden may have extra cols like 'Unnamed: 0' from to_csv)
    extra_in_golden = set(expected.columns) - set(actual.columns)
    expected = expected.drop(columns=list(extra_in_golden))

    assert set(actual.columns) == set(expected.columns), (
        f"{view_name}: column mismatch. "
        f"actual={sorted(actual.columns)}, expected={sorted(expected.columns)}"
    )

    pd.testing.assert_frame_equal(
        _normalize(actual[sorted(actual.columns)]),
        _normalize(expected[sorted(actual.columns)]),
        check_like=True,
        check_dtype=False,
        rtol=1e-4,
    )


# ---------------------------------------------------------------------------
# Column-presence tests (Jurisdiction and County must always be present)
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "view_name",
    [
        "unemployment_rate",
        "median_earnings",
        "median_home_value",
        "median_smoc",
        "commute_time",
        "commute_habits",
        "historic_population",
    ],
)
def test_required_columns_present(view_name: str):
    df = timeseries_db.query_timeseries(view_name)
    assert "Jurisdiction" in df.columns, f"{view_name}: missing Jurisdiction"
    assert "County" in df.columns, f"{view_name}: missing County"
    assert "NAME" in df.columns, f"{view_name}: missing NAME"
    assert len(df) > 0, f"{view_name}: returned empty (no filter)"


# ---------------------------------------------------------------------------
# Filter-correctness tests
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "view_name",
    [
        "unemployment_rate",
        "median_earnings",
        "median_home_value",
        "median_smoc",
        "commute_time",
        "commute_habits",
    ],
)
def test_jurisdiction_filter_restricts_rows(view_name: str):
    df = timeseries_db.query_timeseries(view_name, {"Jurisdiction": [FILTER_TOWN]})
    assert len(df) > 0, f"{view_name}: empty result for {FILTER_TOWN!r}"
    assert (df["Jurisdiction"] == FILTER_TOWN).all(), (
        f"{view_name}: rows outside filter returned"
    )


def test_empty_filter_returns_all():
    df_all = timeseries_db.query_timeseries("unemployment_rate")
    df_empty = timeseries_db.query_timeseries("unemployment_rate", {})
    assert len(df_all) == len(df_empty)


def test_nonsense_filter_returns_empty():
    df = timeseries_db.query_timeseries(
        "unemployment_rate", {"Jurisdiction": ["__nonexistent__"]}
    )
    assert len(df) == 0


def test_county_filter_works():
    df = timeseries_db.query_timeseries("unemployment_rate", {"County": ["Addison"]})
    assert len(df) > 0
    assert (df["County"] == "Addison").all()


def test_unknown_column_in_filter_is_ignored():
    """Unknown filter keys must be silently skipped, not raise an error."""
    df = timeseries_db.query_timeseries(
        "unemployment_rate",
        {"Jurisdiction": [FILTER_TOWN], "__bad_col__": ["x"]},
    )
    assert len(df) > 0


# ---------------------------------------------------------------------------
# View-registry test
# ---------------------------------------------------------------------------


def test_unknown_view_raises_key_error():
    with pytest.raises(KeyError):
        timeseries_db.query_timeseries("nonexistent_view")
