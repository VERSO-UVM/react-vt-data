"""
Tests for api/models/response_models.py:
  serialize_data(), make_response(), APIResponse
"""

import pandas as pd
import pytest

from api.models.response_models import APIResponse, make_response, serialize_data

# ---------------------------------------------------------------------------
# serialize_data()
# ---------------------------------------------------------------------------


class TestSerializeData:
    def test_dataframe_to_records(self):
        df = pd.DataFrame({"a": [1, 2], "b": ["x", "y"]})
        result = serialize_data(df)
        assert result == [{"a": 1, "b": "x"}, {"a": 2, "b": "y"}]

    def test_list_passthrough(self):
        data = [{"key": "val"}]
        assert serialize_data(data) == data

    def test_dict_passthrough(self):
        data = {"nested": [1, 2, 3]}
        assert serialize_data(data) == data

    def test_empty_dataframe(self):
        df = pd.DataFrame({"col": pd.Series([], dtype=float)})
        result = serialize_data(df)
        assert result == []

    def test_geodataframe_drops_geometry(self):
        """GeoDataFrame with geometry column should serialize without it."""
        gpd = pytest.importorskip("geopandas")
        from shapely.geometry import Point

        gdf = gpd.GeoDataFrame(
            {"name": ["Burlington"], "pop": [44000]},
            geometry=[Point(-73.2, 44.5)],
        )
        result = serialize_data(gdf)
        assert isinstance(result, list)
        assert len(result) == 1
        assert "geometry" not in result[0]
        assert result[0]["name"] == "Burlington"


# ---------------------------------------------------------------------------
# make_response()
# ---------------------------------------------------------------------------


class TestMakeResponse:
    def test_basic_dataframe(self):
        df = pd.DataFrame({"x": [1]})
        resp = make_response(data=df, metadata={"source": "ACS"})
        assert isinstance(resp, APIResponse)
        assert resp.data == [{"x": 1}]
        assert resp.metadata == {"source": "ACS"}
        assert resp.tableData is None

    def test_with_table_data(self):
        df = pd.DataFrame({"x": [1]})
        table_df = pd.DataFrame({"y": [2]})
        resp = make_response(data=df, metadata={}, tableData=table_df)
        assert resp.tableData == [{"y": 2}]

    def test_dict_data(self):
        resp = make_response(data={"key": "val"}, metadata={})
        assert resp.data == {"key": "val"}

    def test_list_data(self):
        resp = make_response(data=[{"a": 1}], metadata={})
        assert resp.data == [{"a": 1}]

    def test_empty_metadata(self):
        resp = make_response(data=[], metadata={})
        assert resp.metadata == {}


# ---------------------------------------------------------------------------
# APIResponse model
# ---------------------------------------------------------------------------


class TestAPIResponse:
    def test_defaults(self):
        resp = APIResponse(data=[], metadata={})
        assert resp.tableData is None

    def test_data_as_list(self):
        resp = APIResponse(data=[1, 2, 3], metadata=None)
        assert resp.data == [1, 2, 3]

    def test_data_as_dict(self):
        resp = APIResponse(data={"k": "v"}, metadata=None)
        assert resp.data == {"k": "v"}
