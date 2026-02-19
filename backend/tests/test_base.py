"""
Tests for data_collection/base.py:
  pct(), VarGroup, compute_tidy_generic()
"""
import pandas as pd
import pytest

from data_collection.base import VarGroup, compute_tidy_generic, pct


# ---------------------------------------------------------------------------
# pct()
# ---------------------------------------------------------------------------

class TestPct:
    def test_normal(self):
        assert pct(50, 200) == 25.0

    def test_rounds_to_one_decimal(self):
        assert pct(1, 3) == 33.3

    def test_zero_denominator_returns_none(self):
        assert pct(10, 0) is None

    def test_none_denominator_returns_none(self):
        assert pct(10, None) is None

    def test_full_percent(self):
        assert pct(100, 100) == 100.0

    def test_zero_numerator(self):
        assert pct(0, 100) == 0.0

    def test_large_values(self):
        result = pct(12546, 14305)
        assert result == pytest.approx(87.7, abs=0.1)


# ---------------------------------------------------------------------------
# VarGroup
# ---------------------------------------------------------------------------

class TestVarGroup:
    def test_basic_construction(self):
        vg = VarGroup("My Label", "My Section", ["B01001_001E"])
        assert vg.label == "My Label"
        assert vg.section == "My Section"
        assert vg.codes == ["B01001_001E"]
        assert vg.denom is None  # default

    def test_with_denom(self):
        vg = VarGroup("Rate", "Labor", ["B23025_002E"], ["B23025_001E"])
        assert vg.denom == ["B23025_001E"]

    def test_multi_code(self):
        vg = VarGroup("Total", "Pop", ["B01001_002E", "B01001_026E"])
        assert len(vg.codes) == 2


# ---------------------------------------------------------------------------
# compute_tidy_generic()
# ---------------------------------------------------------------------------

def _make_df(**extra_cols):
    """Helper to build a minimal raw fetch DataFrame."""
    base = {
        "year": [2020],
        "geo_type": ["county"],
        "NAME": ["Burlington city, Chittenden County, Vermont"],
        "state": ["50"],
        "county": ["007"],
    }
    base.update(extra_cols)
    return pd.DataFrame(base)


class TestComputeTidyGeneric:
    def test_single_group_with_denom(self):
        df = _make_df(B23025_001E=[1000.0], B23025_002E=[650.0])
        groups = [VarGroup("LFP Rate", "Labor", ["B23025_002E"], ["B23025_001E"])]
        result = compute_tidy_generic(df, groups)

        assert len(result) == 1
        row = result.iloc[0]
        assert row["Variable"] == "LFP Rate"
        assert row["Section"] == "Labor"
        assert row["Value"] == 650.0
        assert row["Percent"] == 65.0

    def test_single_group_no_denom(self):
        df = _make_df(B19013_001E=[75000.0])
        groups = [VarGroup("Median HH Income", "Income", ["B19013_001E"])]
        result = compute_tidy_generic(df, groups)

        assert result.iloc[0]["Value"] == 75000.0
        assert result.iloc[0]["Percent"] is None

    def test_multi_code_summed(self):
        """Codes within a group should be summed into one Value."""
        df = _make_df(B01001_002E=[500.0], B01001_026E=[520.0])
        groups = [VarGroup("Total Pop", "Pop", ["B01001_002E", "B01001_026E"])]
        result = compute_tidy_generic(df, groups)

        assert result.iloc[0]["Value"] == 1020.0

    def test_multi_group_produces_one_row_each(self):
        df = _make_df(A=[10.0], B=[5.0], C=[20.0])
        groups = [
            VarGroup("Metric A", "Sec", ["A"]),
            VarGroup("Metric B", "Sec", ["B"]),
        ]
        result = compute_tidy_generic(df, groups)
        assert len(result) == 2
        assert set(result["Variable"]) == {"Metric A", "Metric B"}

    def test_missing_code_treated_as_zero(self):
        """A code absent from the row (NaN/None) should contribute 0."""
        df = _make_df(B01001_002E=[None])
        groups = [VarGroup("X", "S", ["B01001_002E", "B_MISSING"])]
        result = compute_tidy_generic(df, groups)
        assert result.iloc[0]["Value"] == 0

    def test_passthrough_base_columns(self):
        df = _make_df(B01001_001E=[100.0])
        groups = [VarGroup("Pop", "Pop", ["B01001_001E"])]
        result = compute_tidy_generic(df, groups)
        row = result.iloc[0]
        assert row["year"] == 2020
        assert row["geo_type"] == "county"
        assert row["NAME"] == "Burlington city, Chittenden County, Vermont"
        assert row["state"] == "50"
        assert row["county"] == "007"

    def test_multiple_geographies(self):
        df = pd.DataFrame({
            "year": [2020, 2020],
            "geo_type": ["county", "county_subdivision"],
            "NAME": ["Chittenden County, Vermont", "Burlington city, Chittenden County, Vermont"],
            "state": ["50", "50"],
            "county": ["007", "007"],
            "B01001_001E": [170000.0, 44000.0],
        })
        groups = [VarGroup("Population", "Demo", ["B01001_001E"])]
        result = compute_tidy_generic(df, groups)
        assert len(result) == 2
        assert set(result["geo_type"]) == {"county", "county_subdivision"}
