"""
Data export route — returns filtered Vermont data as CSV.

Census ACS snapshot sources export tidy (long-format) data with human-readable
column names (Measure, Category, Subcategory, Variable, Value) instead of raw
census codes like DP04_0001E.

Rate limiting: max RATE_LIMIT_MAX downloads per IP per RATE_LIMIT_WINDOW_SECS.
Row cap: MAX_ROWS_PER_EXPORT rows per download.
"""

import io
import threading
import time
from collections import defaultdict

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app_utils import data_loading, timeseries_db

router = APIRouter(prefix="/export", tags=["export"])

MAX_ROWS_PER_EXPORT = 10_000
RATE_LIMIT_MAX = 10
RATE_LIMIT_WINDOW_SECS = 3600

_rate_store: dict[str, list[float]] = defaultdict(list)
_rate_lock = threading.Lock()


# ---------------------------------------------------------------------------
# Internal loaders — each returns a DataFrame with geometry already dropped
# ---------------------------------------------------------------------------


def _load_tidy_census(cache_name: str, tidy_key: str):
    """
    Load a tidy (long-format) census DataFrame from the masterload cache.
    Column names are human-readable: Measure, Category, Subcategory, Variable,
    Value — not raw census codes.
    """
    df_dict = data_loading.masterload(cache_name)
    df = df_dict[tidy_key].copy()
    if "geometry" in df.columns:
        df = df.drop(columns=["geometry"])
    return df


def _load_timeseries(table_name: str):
    """Load a full timeseries table from DuckDB (all years, all geographies)."""
    return timeseries_db.query_timeseries(table_name)


def _load_zoning():
    """
    Load Vermont zoning districts, dropping map-only columns (geometry, colors,
    tooltip HTML) so the result is clean tabular data.
    """
    gdf = data_loading.masterload("zoning")
    drop_cols = ["geometry", "fill", "fill-opacity", "tooltip", "Acres_fmt"]
    return gdf.drop(columns=[c for c in drop_cols if c in gdf.columns])


# ---------------------------------------------------------------------------
# Source registry
# ---------------------------------------------------------------------------
# Each entry: metadata (all str, serializable to frontend) + "loader" (callable).
# The "loader" key is stripped before sending to the frontend.

EXPORT_SOURCES: dict[str, dict] = {
    # --- Census ACS 2023 Snapshot (tidy / human-readable) ---
    "census_housing": {
        "label": "Housing",
        "group": "Census ACS 2023 Snapshot",
        "description": (
            "Housing occupancy, units, value, and cost characteristics. "
            "Exported in tidy format with readable labels "
            "(Category, Subcategory, Variable, Measure) rather than raw census codes."
        ),
        "primary_source": "https://data.census.gov/table/ACSDP5Y2023.DP04",
        "loader": lambda: _load_tidy_census("census_housing", "housing_2023_tidy"),
    },
    "census_economic": {
        "label": "Economic",
        "group": "Census ACS 2023 Snapshot",
        "description": (
            "Employment, income, commute, and industry characteristics. "
            "Exported with readable labels rather than raw census codes."
        ),
        "primary_source": "https://data.census.gov/table/ACSDP5Y2023.DP03",
        "loader": lambda: _load_tidy_census("census_economics", "econ_2023_tidy"),
    },
    "census_demographic": {
        "label": "Demographic",
        "group": "Census ACS 2023 Snapshot",
        "description": (
            "Age, sex, race, and population characteristics. "
            "Exported with readable labels rather than raw census codes."
        ),
        "primary_source": "https://data.census.gov/table/ACSDP5Y2023.DP05",
        "loader": lambda: _load_tidy_census(
            "census_demographics", "demogs_2023_tidy"
        ),
    },
    "census_social": {
        "label": "Social",
        "group": "Census ACS 2023 Snapshot",
        "description": (
            "Education, language, disability, and citizenship characteristics. "
            "Exported with readable labels rather than raw census codes."
        ),
        "primary_source": "https://data.census.gov/table/ACSDP5Y2023.DP02",
        "loader": lambda: _load_tidy_census("census_social", "social_2023_tidy"),
    },
    # --- Historical Trends (time-series from DuckDB) ---
    "ts_median_home_value": {
        "label": "Median Home Value by Year",
        "group": "Historical Trends",
        "description": "Median owner-occupied home value by town and year (ACS 5-year).",
        "primary_source": "https://data.census.gov/table/ACSDP5Y2023.DP04",
        "loader": lambda: _load_timeseries("median_home_value"),
    },
    "ts_median_smoc": {
        "label": "Median Monthly Owner Cost (SMOC) by Year",
        "group": "Historical Trends",
        "description": (
            "Median selected monthly owner costs (with and without a mortgage) "
            "by town and year (ACS 5-year)."
        ),
        "primary_source": "https://data.census.gov/table/ACSDP5Y2023.DP04",
        "loader": lambda: _load_timeseries("median_smoc"),
    },
    "ts_unemployment_rate": {
        "label": "Unemployment Rate by Year",
        "group": "Historical Trends",
        "description": "Annual unemployment rate by town and year (ACS 5-year).",
        "primary_source": "https://data.census.gov/table/ACSDP5Y2023.DP03",
        "loader": lambda: _load_timeseries("unemployment_rate"),
    },
    "ts_median_earnings": {
        "label": "Median Earnings by Year",
        "group": "Historical Trends",
        "description": "Median earnings for full-time workers by town and year (ACS 5-year).",
        "primary_source": "https://data.census.gov/table/ACSDP5Y2023.DP03",
        "loader": lambda: _load_timeseries("median_earnings"),
    },
    "ts_commute_time": {
        "label": "Commute Time by Year",
        "group": "Historical Trends",
        "description": "Mean travel time to work by town and year (ACS 5-year).",
        "primary_source": "https://data.census.gov/table/ACSDP5Y2023.DP03",
        "loader": lambda: _load_timeseries("commute_time"),
    },
    "ts_commute_habits": {
        "label": "Commute Habits by Year",
        "group": "Historical Trends",
        "description": "Commute mode share (car, transit, WFH, etc.) by town and year (ACS 5-year).",
        "primary_source": "https://data.census.gov/table/ACSDP5Y2023.DP03",
        "loader": lambda: _load_timeseries("commute_habits"),
    },
    "ts_historic_population": {
        "label": "Historic Population by Year",
        "group": "Historical Trends",
        "description": "Vermont municipal population estimates by town and year.",
        "primary_source": "https://www.census.gov/programs-surveys/decennial-census.html",
        "loader": lambda: _load_timeseries("historic_population"),
    },
    # --- Land Use ---
    "zoning": {
        "label": "Zoning Districts",
        "group": "Land Use",
        "description": (
            "Vermont zoning district boundaries with district name, type "
            "(residential, mixed, nonresidential, overlay), and acreage. "
            "Geometry is excluded; use the Exploratory Mapping tab for map views."
        ),
        "primary_source": "https://geodata.vermont.gov/datasets/VCGI::vt-zoning-areas/about",
        "loader": _load_zoning,
    },
}

# Serializable subset sent to the frontend (excludes the internal "loader" key)
_SOURCE_META_KEYS = {"label", "group", "description", "primary_source"}


# ---------------------------------------------------------------------------
# Rate limiting
# ---------------------------------------------------------------------------


def _check_rate_limit(ip: str) -> None:
    """Raise 429 if this IP has exceeded the hourly download limit."""
    now = time.time()
    cutoff = now - RATE_LIMIT_WINDOW_SECS
    with _rate_lock:
        timestamps = [t for t in _rate_store[ip] if t > cutoff]
        _rate_store[ip] = timestamps
        if len(timestamps) >= RATE_LIMIT_MAX:
            raise HTTPException(
                status_code=429,
                detail=(
                    f"Download limit reached. You may download at most "
                    f"{RATE_LIMIT_MAX} files per hour. Please try again later."
                ),
            )
        _rate_store[ip].append(now)


def _get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


# ---------------------------------------------------------------------------
# Request model
# ---------------------------------------------------------------------------


class ExportRequest(BaseModel):
    source: str
    county: str | None = None
    jurisdiction: str | None = None


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("/sources")
async def list_export_sources():
    """Return available export sources with metadata (no internal loader)."""
    return {
        key: {k: v for k, v in meta.items() if k in _SOURCE_META_KEYS}
        for key, meta in EXPORT_SOURCES.items()
    }


@router.get("/locations")
async def list_locations():
    """
    Return sorted lists of Vermont counties and towns derived from the housing
    dataset (representative of all census datasets).
    """
    df = _load_tidy_census("census_housing", "housing_2023_tidy")
    counties = (
        sorted(df["County"].dropna().unique().tolist())
        if "County" in df.columns
        else []
    )
    towns = (
        sorted(df["Jurisdiction"].dropna().unique().tolist())
        if "Jurisdiction" in df.columns
        else []
    )
    return {"counties": counties, "towns": towns}


@router.post("/csv")
async def export_csv(body: ExportRequest, request: Request):
    """
    Return a filtered dataset as a CSV file.

    Optional filters (omit for statewide):
      - county: Vermont county name
      - jurisdiction: town/city name

    Row cap: 10,000 rows. Rate limit: 10 downloads per IP per hour.
    Census ACS sources export human-readable variable labels rather than raw codes.
    """
    ip = _get_client_ip(request)
    _check_rate_limit(ip)

    if body.source not in EXPORT_SOURCES:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown source '{body.source}'. Valid options: {list(EXPORT_SOURCES)}",
        )

    source_meta = EXPORT_SOURCES[body.source]

    try:
        df = source_meta["loader"]()
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Could not load dataset '{body.source}': {exc}",
        ) from exc

    # Drop geometry if present
    if "geometry" in df.columns:
        df = df.drop(columns=["geometry"])

    # Apply area filters
    if body.county and "County" in df.columns:
        df = df[df["County"] == body.county]

    if body.jurisdiction and "Jurisdiction" in df.columns:
        df = df[df["Jurisdiction"] == body.jurisdiction]

    if df.empty:
        raise HTTPException(status_code=404, detail="No data matched the selected filters.")

    truncated = len(df) > MAX_ROWS_PER_EXPORT
    df = df.head(MAX_ROWS_PER_EXPORT)

    csv_buffer = io.StringIO()
    df.to_csv(csv_buffer, index=False)
    csv_bytes = csv_buffer.getvalue().encode("utf-8")

    area_slug = (body.jurisdiction or body.county or "vermont").lower().replace(" ", "-")
    filename = f"vt-data-{body.source}-{area_slug}.csv"

    headers = {
        "Content-Disposition": f'attachment; filename="{filename}"',
        "X-Row-Count": str(len(df)),
        "X-Truncated": str(truncated).lower(),
        "X-Primary-Source": source_meta["primary_source"],
    }

    return StreamingResponse(
        iter([csv_bytes]),
        media_type="text/csv",
        headers=headers,
    )
