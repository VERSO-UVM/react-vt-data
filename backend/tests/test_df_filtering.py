"""
Tests for app_utils/df_filtering.py:
  FilterState (dataframe_to_tree, apply_filters, set_filters),
  filter_from_request()
"""

import pandas as pd
import pytest

from api.models.filter_models import FilterRequest
from app_utils.df_filtering import FilterState, filter_from_request

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def sample_df():
    return pd.DataFrame(
        {
            "County": ["Chittenden", "Chittenden", "Washington", "Washington"],
            "Jurisdiction": ["Burlington", "Winooski", "Montpelier", "Barre City"],
            "Value": [100, 200, 300, 400],
        }
    )


@pytest.fixture
def fs(sample_df):
    return FilterState(df=sample_df, filter_columns=["County", "Jurisdiction"])


# ---------------------------------------------------------------------------
# FilterState.dataframe_to_tree()
# ---------------------------------------------------------------------------


class TestDataframeToTree:
    def test_top_level_keys(self, fs):
        assert set(fs.tree.keys()) == {"Chittenden", "Washington"}

    def test_second_level_keys(self, fs):
        assert set(fs.tree["Chittenden"].keys()) == {"Burlington", "Winooski"}
        assert set(fs.tree["Washington"].keys()) == {"Montpelier", "Barre City"}

    def test_leaf_is_none(self, fs):
        """Leaves (past the last column) should be None."""
        assert fs.tree["Chittenden"]["Burlington"] is None

    def test_empty_hierarchy_returns_none(self, sample_df):
        fs2 = FilterState(df=sample_df, filter_columns=[])
        assert fs2.tree is None

    def test_single_level(self, sample_df):
        fs2 = FilterState(df=sample_df, filter_columns=["County"])
        assert set(fs2.tree.keys()) == {"Chittenden", "Washington"}


# ---------------------------------------------------------------------------
# FilterState.apply_filters()
# ---------------------------------------------------------------------------


class TestApplyFilters:
    def test_no_filters_returns_full_df(self, fs, sample_df):
        result = fs.apply_filters()
        assert len(result) == len(sample_df)

    def test_single_filter(self, fs):
        fs.selections["County"] = ["Chittenden"]
        result = fs.apply_filters()
        assert list(result["County"].unique()) == ["Chittenden"]
        assert len(result) == 2

    def test_multi_value_filter(self, fs):
        fs.selections["County"] = ["Chittenden", "Washington"]
        result = fs.apply_filters()
        assert len(result) == 4

    def test_cascaded_filters(self, fs):
        fs.selections["County"] = ["Chittenden"]
        fs.selections["Jurisdiction"] = ["Burlington"]
        result = fs.apply_filters()
        assert len(result) == 1
        assert result.iloc[0]["Value"] == 100

    def test_none_selection_ignored(self, fs):
        """None selection (default) should not filter anything."""
        fs.selections["County"] = None
        result = fs.apply_filters()
        assert len(result) == 4

    def test_missing_column_skipped(self, fs):
        """Filter on a column not in the df should be silently skipped."""
        fs.selections["NonExistent"] = ["X"]
        result = fs.apply_filters()
        assert len(result) == 4


# ---------------------------------------------------------------------------
# FilterState.set_filters()
# ---------------------------------------------------------------------------


class TestSetFilters:
    def test_sets_list_value(self, fs):
        fs.set_filters({"County": ["Chittenden"]})
        assert fs.selections["County"] == ["Chittenden"]

    def test_wraps_scalar_in_list(self, fs):
        fs.set_filters({"County": "Chittenden"})
        assert fs.selections["County"] == ["Chittenden"]

    def test_ignores_unknown_column(self, fs):
        """Keys not in filter_columns should be silently ignored."""
        fs.set_filters({"Unknown": ["X"]})
        assert "Unknown" not in fs.selections

    def test_multi_column(self, fs):
        fs.set_filters({"County": ["Washington"], "Jurisdiction": ["Montpelier"]})
        assert fs.selections["County"] == ["Washington"]
        assert fs.selections["Jurisdiction"] == ["Montpelier"]


# ---------------------------------------------------------------------------
# filter_from_request()
# ---------------------------------------------------------------------------


class TestFilterFromRequest:
    def test_no_filters_returns_original(self, sample_df):
        req = FilterRequest(filters={})
        result = filter_from_request(sample_df, req)
        assert len(result) == len(sample_df)

    def test_single_filter_applied(self, sample_df):
        req = FilterRequest(filters={"County": ["Chittenden"]})
        result = filter_from_request(sample_df, req)
        assert len(result) == 2
        assert all(result["County"] == "Chittenden")

    def test_multi_filter_cascades(self, sample_df):
        req = FilterRequest(
            filters={"County": ["Washington"], "Jurisdiction": ["Montpelier"]}
        )
        result = filter_from_request(sample_df, req)
        assert len(result) == 1
        assert result.iloc[0]["Jurisdiction"] == "Montpelier"

    def test_invalid_column_raises_http_exception(self, sample_df):
        from fastapi import HTTPException

        req = FilterRequest(filters={"BadColumn": ["X"]})
        with pytest.raises(HTTPException) as exc_info:
            filter_from_request(sample_df, req)
        assert exc_info.value.status_code == 400
