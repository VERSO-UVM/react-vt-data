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
# App fixture
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
        old_time = time.time() - 7200  # 2 hours ago
        _rate_store[ip] = [old_time] * RATE_LIMIT_MAX
        # Should succeed because all timestamps are expired
        _check_rate_limit(ip)


# ---------------------------------------------------------------------------
# ExportRequest model
# ---------------------------------------------------------------------------


class TestExportRequest:
    def test_source_only(self):
        req = ExportRequest(source="census_housing")
        assert req.source == "census_housing"
        assert req.county is None
        assert req.jurisdiction is None

    def test_county_filter(self):
        req = ExportRequest(source="census_economic", county="Chittenden")
        assert req.county == "Chittenden"

    def test_town_filter(self):
        req = ExportRequest(source="census_demographic", jurisdiction="Burlington")
        assert req.jurisdiction == "Burlington"


# ---------------------------------------------------------------------------
# Mock DataFrame for endpoint tests
# ---------------------------------------------------------------------------

MOCK_TIDY_DF = pd.DataFrame(
    {
        "Jurisdiction": ["Burlington", "South Burlington", "Montpelier"],
        "County": ["Chittenden", "Chittenden", "Washington"],
        "Measure": ["Estimate", "Estimate", "Estimate"],
        "Category": ["HOUSING OCCUPANCY"] * 3,
        "Subcategory": ["Total housing units"] * 3,
        "Variable": ["Total", "Total", "Total"],
        "Value": [19000, 8000, 4500],
    }
)


class TestExportSourcesEndpoint:
    def test_returns_source_list(self):
        resp = client.get("/export/sources")
        assert resp.status_code == 200
        data = resp.json()
        assert "census_housing" in data
        assert "census_economic" in data
        assert "ts_median_home_value" in data
        assert "zoning" in data

    def test_sources_have_required_fields(self):
        resp = client.get("/export/sources")
        for key, meta in resp.json().items():
            assert "label" in meta, f"{key} missing label"
            assert "group" in meta, f"{key} missing group"
            assert "description" in meta, f"{key} missing description"
            assert "primary_source" in meta, f"{key} missing primary_source"

    def test_loader_not_exposed(self):
        """The internal loader callable must not appear in the API response."""
        resp = client.get("/export/sources")
        for meta in resp.json().values():
            assert "loader" not in meta


class TestExportLocationsEndpoint:
    def test_returns_counties_and_towns(self):
        with patch(
            "api.routes.post_routes.post_export._load_tidy_census",
            return_value=MOCK_TIDY_DF,
        ):
            resp = client.get("/export/locations")
        assert resp.status_code == 200
        body = resp.json()
        assert "Chittenden" in body["counties"]
        assert "Burlington" in body["towns"]


class TestExportCsvEndpoint:
    def setup_method(self):
        clear_rate_store()

    def _post(self, body):
        with patch(
            "api.routes.post_routes.post_export.EXPORT_SOURCES",
            {
                "census_housing": {
                    "label": "Housing",
                    "group": "Census ACS 2023 Snapshot",
                    "description": "test",
                    "primary_source": "https://example.com",
                    "loader": lambda: MOCK_TIDY_DF.copy(),
                }
            },
        ):
            return client.post("/export/csv", json=body)

    def test_statewide_download(self):
        resp = self._post({"source": "census_housing"})
        assert resp.status_code == 200
        assert resp.headers["content-type"].startswith("text/csv")
        df = pd.read_csv(StringIO(resp.text))
        assert len(df) == 3
        # Tidy columns should be present
        assert "Variable" in df.columns
        assert "Category" in df.columns

    def test_county_filter(self):
        resp = self._post({"source": "census_housing", "county": "Chittenden"})
        assert resp.status_code == 200
        df = pd.read_csv(StringIO(resp.text))
        assert len(df) == 2
        assert all(df["County"] == "Chittenden")

    def test_town_filter(self):
        resp = self._post({"source": "census_housing", "jurisdiction": "Burlington"})
        assert resp.status_code == 200
        df = pd.read_csv(StringIO(resp.text))
        assert len(df) == 1
        assert df.iloc[0]["Jurisdiction"] == "Burlington"

    def test_unknown_source_returns_400(self):
        resp = client.post("/export/csv", json={"source": "nonexistent"})
        assert resp.status_code == 400

    def test_no_matching_rows_returns_404(self):
        resp = self._post({"source": "census_housing", "county": "NoSuchCounty"})
        assert resp.status_code == 404

    def test_row_cap_truncation(self):
        big_df = pd.DataFrame(
            {
                "Jurisdiction": ["Town"] * 20_000,
                "County": ["Chittenden"] * 20_000,
                "Variable": ["Total"] * 20_000,
                "Value": range(20_000),
            }
        )
        with patch(
            "api.routes.post_routes.post_export.EXPORT_SOURCES",
            {
                "census_housing": {
                    "label": "Housing",
                    "group": "test",
                    "description": "test",
                    "primary_source": "https://example.com",
                    "loader": lambda: big_df.copy(),
                }
            },
        ):
            resp = client.post("/export/csv", json={"source": "census_housing"})
        assert resp.status_code == 200
        assert resp.headers.get("X-Truncated") == "true"
        df = pd.read_csv(StringIO(resp.text))
        assert len(df) == 10_000

    def test_filename_in_content_disposition(self):
        resp = self._post({"source": "census_housing"})
        assert "attachment" in resp.headers.get("Content-Disposition", "")
        assert ".csv" in resp.headers.get("Content-Disposition", "")

    def test_loader_exception_returns_503(self):
        def bad_loader():
            raise RuntimeError("disk failure")

        with patch(
            "api.routes.post_routes.post_export.EXPORT_SOURCES",
            {
                "census_housing": {
                    "label": "Housing",
                    "group": "test",
                    "description": "test",
                    "primary_source": "https://example.com",
                    "loader": bad_loader,
                }
            },
        ):
            resp = client.post("/export/csv", json={"source": "census_housing"})
        assert resp.status_code == 503
