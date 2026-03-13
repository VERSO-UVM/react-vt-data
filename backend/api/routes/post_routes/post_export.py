"""
Data export route — returns filtered census data as CSV.

Rate limiting: max RATE_LIMIT_MAX downloads per IP per RATE_LIMIT_WINDOW_SECS.
Row cap: MAX_ROWS_PER_EXPORT rows per download.
"""

import io
import threading
import time
from collections import defaultdict
from pathlib import Path

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app_utils import data_loading

router = APIRouter(prefix="/export", tags=["export"])

DATADIR = Path(__file__).parent.parent.parent.parent / "Data"
CENSUS_DATADIR = DATADIR / "Census"

MAX_ROWS_PER_EXPORT = 10_000
RATE_LIMIT_MAX = 10          # downloads per IP
RATE_LIMIT_WINDOW_SECS = 3600  # per hour

# In-memory rate limit store: ip -> list of timestamps
_rate_store: dict[str, list[float]] = defaultdict(list)
_rate_lock = threading.Lock()

EXPORT_SOURCES = {
    "housing": {
        "label": "Housing (ACS 2023)",
        "path": CENSUS_DATADIR / "VT_HOUSING_ALL.fgb",
        "description": "ACS 5-year housing estimates for Vermont geographies.",
        "primary_source": "https://data.census.gov/table/ACSDP5Y2023.DP04",
    },
    "economic": {
        "label": "Economic (ACS 2023)",
        "path": CENSUS_DATADIR / "VT_ECONOMIC_ALL.fgb",
        "description": "ACS 5-year economic characteristics for Vermont geographies.",
        "primary_source": "https://data.census.gov/table/ACSDP5Y2023.DP03",
    },
    "demographic": {
        "label": "Demographic (ACS 2023)",
        "path": CENSUS_DATADIR / "VT_DEMOGRAPHIC_ALL.fgb",
        "description": "ACS 5-year demographic and housing estimates for Vermont geographies.",
        "primary_source": "https://data.census.gov/table/ACSDP5Y2023.DP05",
    },
    "social": {
        "label": "Social (ACS 2023)",
        "path": CENSUS_DATADIR / "VT_SOCIAL_ALL.fgb",
        "description": "ACS 5-year social characteristics for Vermont geographies.",
        "primary_source": "https://data.census.gov/table/ACSDP5Y2023.DP02",
    },
}


class ExportRequest(BaseModel):
    source: str
    county: str | None = None
    jurisdiction: str | None = None


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


@router.get("/sources")
async def list_export_sources():
    """Return available export sources with metadata."""
    return {
        key: {
            "label": val["label"],
            "description": val["description"],
            "primary_source": val["primary_source"],
        }
        for key, val in EXPORT_SOURCES.items()
    }


@router.get("/locations")
async def list_locations():
    """
    Return sorted lists of Vermont counties and towns (jurisdictions)
    derived from the housing dataset (representative of all census datasets).
    Results are cached after first load.
    """
    df = data_loading.load_census_data(EXPORT_SOURCES["housing"]["path"])
    counties = sorted(df["County"].dropna().unique().tolist()) if "County" in df.columns else []
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

    Filters (all optional — omit for statewide):
      - county: Vermont county name
      - jurisdiction: town/city name

    Row cap: {MAX_ROWS_PER_EXPORT} rows. Rate limit: {RATE_LIMIT_MAX}/hr per IP.
    """
    ip = _get_client_ip(request)
    _check_rate_limit(ip)

    if body.source not in EXPORT_SOURCES:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown source '{body.source}'. Valid options: {list(EXPORT_SOURCES)}",
        )

    source_meta = EXPORT_SOURCES[body.source]
    df = data_loading.load_census_data(source_meta["path"])

    # Drop geometry column if present (not useful in CSV)
    if "geometry" in df.columns:
        df = df.drop(columns=["geometry"])

    # Apply area filters
    if body.county:
        if "County" not in df.columns:
            raise HTTPException(status_code=400, detail="Dataset has no County column.")
        df = df[df["County"] == body.county]

    if body.jurisdiction:
        if "Jurisdiction" not in df.columns:
            raise HTTPException(status_code=400, detail="Dataset has no Jurisdiction column.")
        df = df[df["Jurisdiction"] == body.jurisdiction]

    if df.empty:
        raise HTTPException(status_code=404, detail="No data matched the selected filters.")

    # Apply row cap
    truncated = len(df) > MAX_ROWS_PER_EXPORT
    df = df.head(MAX_ROWS_PER_EXPORT)

    csv_buffer = io.StringIO()
    df.to_csv(csv_buffer, index=False)
    csv_bytes = csv_buffer.getvalue().encode("utf-8")

    area_slug = (
        body.jurisdiction or body.county or "vermont"
    ).lower().replace(" ", "-")
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
