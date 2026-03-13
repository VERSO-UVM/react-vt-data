"""
Tests for api/routes/post_routes/post_export.py:
  rate limiting, ExportRequest model, CSV endpoint (mocked data).
"""

import time
from io import StringIO
from unittest.mock import patch

import pandas as pd
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.routes.post_routes.post_export import (
    RATE_LIMIT_MAX,
    ExportRequest,
    _check_rate_limit,
    _rate_store,
    router,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

app = FastAPI()
app.include_router(router)
client = TestClient(app)


def clear_rate_store():
    _rate_store.clear()


# ---------------------------------------------------------------------------
# Rate limiter unit tests
# ---------------------------------------------------------------------------


class TestCheckRateLimit:
    def setup_method(self):
        clear_rate_store()

    def test_first_request_allowed(self):
        _check_rate_limit("10.0.0.1")  # should not raise

    def test_up_to_max_allowed(self):
        for _ in range(RATE_LIMIT_MAX):
            _check_rate_limit("10.0.0.2")

    def test_exceeding_max_raises_429(self):
        from fastapi import HTTPException

        for _ in range(RATE_LIMIT_MAX):
            _check_rate_limit("10.0.0.3")
        with pytest.raises(HTTPException) as exc_info:
            _check_rate_limit("10.0.0.3")
        assert exc_info.value.status_code == 429

    def test_different_ips_are_independent(self):
        for _ in range(RATE_LIMIT_MAX):
            _check_rate_limit("10.0.0.4")
        # A different IP should still be allowed
        _check_rate_limit("10.0.0.5")

    def test_old_timestamps_are_pruned(self):
        """Timestamps older than the window should not count toward the limit."""

        ip = "10.0.0.6"
        # Manually inject old timestamps (outside the 1-hour window)
        old_time = time.time() - 7200  # 2 hours ago
        _rate_store[ip] = [old_time] * RATE_LIMIT_MAX
        # Should succeed because all timestamps are expired
        _check_rate_limit(ip)


# ---------------------------------------------------------------------------
# ExportRequest model
# ---------------------------------------------------------------------------


class TestExportRequest:
    def test_source_only(self):
        req = ExportRequest(source="housing")
        assert req.source == "housing"
        assert req.county is None
        assert req.jurisdiction is None

    def test_county_filter(self):
        req = ExportRequest(source="economic", county="Chittenden")
        assert req.county == "Chittenden"

    def test_town_filter(self):
        req = ExportRequest(source="demographic", jurisdiction="Burlington")
        assert req.jurisdiction == "Burlington"


# ---------------------------------------------------------------------------
# Endpoint integration tests (mocked data loading)
# ---------------------------------------------------------------------------

MOCK_DF = pd.DataFrame(
    {
        "Jurisdiction": ["Burlington", "South Burlington", "Montpelier"],
        "County": ["Chittenden", "Chittenden", "Washington"],
        "Population": [44000, 19000, 8000],
    }
)


class TestExportSourcesEndpoint:
    def test_returns_source_list(self):
        resp = client.get("/export/sources")
        assert resp.status_code == 200
        data = resp.json()
        assert "housing" in data
        assert "label" in data["housing"]
        assert "description" in data["housing"]


class TestExportLocationsEndpoint:
    def test_returns_counties_and_towns(self):
        with patch(
            "api.routes.post_routes.post_export.data_loading.load_census_data",
            return_value=MOCK_DF,
        ):
            resp = client.get("/export/locations")
        assert resp.status_code == 200
        body = resp.json()
        assert "counties" in body
        assert "towns" in body
        assert "Chittenden" in body["counties"]
        assert "Burlington" in body["towns"]


class TestExportCsvEndpoint:
    def setup_method(self):
        clear_rate_store()

    def test_statewide_download(self):
        with patch(
            "api.routes.post_routes.post_export.data_loading.load_census_data",
            return_value=MOCK_DF,
        ):
            resp = client.post("/export/csv", json={"source": "housing"})
        assert resp.status_code == 200
        assert resp.headers["content-type"].startswith("text/csv")
        df = pd.read_csv(StringIO(resp.text))
        assert len(df) == 3

    def test_county_filter(self):
        with patch(
            "api.routes.post_routes.post_export.data_loading.load_census_data",
            return_value=MOCK_DF,
        ):
            resp = client.post(
                "/export/csv", json={"source": "housing", "county": "Chittenden"}
            )
        assert resp.status_code == 200
        df = pd.read_csv(StringIO(resp.text))
        assert len(df) == 2
        assert all(df["County"] == "Chittenden")

    def test_town_filter(self):
        with patch(
            "api.routes.post_routes.post_export.data_loading.load_census_data",
            return_value=MOCK_DF,
        ):
            resp = client.post(
                "/export/csv",
                json={"source": "housing", "jurisdiction": "Burlington"},
            )
        assert resp.status_code == 200
        df = pd.read_csv(StringIO(resp.text))
        assert len(df) == 1
        assert df.iloc[0]["Jurisdiction"] == "Burlington"

    def test_unknown_source_returns_400(self):
        resp = client.post("/export/csv", json={"source": "nonexistent"})
        assert resp.status_code == 400

    def test_no_matching_rows_returns_404(self):
        with patch(
            "api.routes.post_routes.post_export.data_loading.load_census_data",
            return_value=MOCK_DF,
        ):
            resp = client.post(
                "/export/csv",
                json={"source": "housing", "county": "NoSuchCounty"},
            )
        assert resp.status_code == 404

    def test_row_cap_truncation(self):
        big_df = pd.DataFrame(
            {
                "Jurisdiction": ["Town"] * 20_000,
                "County": ["Chittenden"] * 20_000,
                "Value": range(20_000),
            }
        )
        with patch(
            "api.routes.post_routes.post_export.data_loading.load_census_data",
            return_value=big_df,
        ):
            resp = client.post("/export/csv", json={"source": "housing"})
        assert resp.status_code == 200
        assert resp.headers.get("X-Truncated") == "true"
        df = pd.read_csv(StringIO(resp.text))
        assert len(df) == 10_000

    def test_filename_in_content_disposition(self):
        with patch(
            "api.routes.post_routes.post_export.data_loading.load_census_data",
            return_value=MOCK_DF,
        ):
            resp = client.post("/export/csv", json={"source": "housing"})
        assert "attachment" in resp.headers.get("Content-Disposition", "")
        assert ".csv" in resp.headers.get("Content-Disposition", "")
