"""
Data export route — returns filtered Vermont data as CSV.

Each exportable dataset registers itself in its own router module's
`EXPORT_SOURCES` dict (see post_acs5_db.py, post_qcew.py, post_zoning.py),
right next to the query functions that already know how to read it. This
module only merges those registries and serves them, so adding a new dataset
to the export tool means adding an `EXPORT_SOURCES` entry alongside that
dataset's own router -- not editing this file.

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

from api.routes.post_routes.post_acs5_db import EXPORT_SOURCES as ACS5_EXPORT_SOURCES
from api.routes.post_routes.post_ambulance import (
    EXPORT_SOURCES as AMBULANCE_EXPORT_SOURCES,
)
from api.routes.post_routes.post_cdc import EXPORT_SOURCES as CDC_EXPORT_SOURCES
from api.routes.post_routes.post_qcew import EXPORT_SOURCES as QCEW_EXPORT_SOURCES
from api.routes.post_routes.post_wastewater import (
    EXPORT_SOURCES as WASTEWATER_EXPORT_SOURCES,
)
from api.routes.post_routes.post_zoning import EXPORT_SOURCES as ZONING_EXPORT_SOURCES

router = APIRouter(prefix="/export", tags=["export"])

MAX_ROWS_PER_EXPORT = 10_000
RATE_LIMIT_MAX = 10
RATE_LIMIT_WINDOW_SECS = 3600

_rate_store: dict[str, list[float]] = defaultdict(list)
_rate_lock = threading.Lock()

# ---------------------------------------------------------------------------
# Source registry — merged from each dataset's own router module. Each entry:
# metadata (all str, serializable to frontend) + "loader" (callable returning
# a DataFrame with geometry already dropped and county/town columns named
# `County` / `Jurisdiction`). The "loader" key is stripped before sending to
# the frontend.
# ---------------------------------------------------------------------------

EXPORT_SOURCES: dict[str, dict] = {
    **ACS5_EXPORT_SOURCES,
    **QCEW_EXPORT_SOURCES,
    **ZONING_EXPORT_SOURCES,
    **WASTEWATER_EXPORT_SOURCES,
    **CDC_EXPORT_SOURCES,
    **AMBULANCE_EXPORT_SOURCES,
}

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
    Return sorted lists of Vermont counties and towns, derived from the ACS5
    housing export source (representative of every town-level dataset).
    """
    df = EXPORT_SOURCES["acs5_housing"]["loader"]()
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
            detail="We're sorry, but we could not load that dataset. Please try a different dataset or change your filter criteria.",
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
        raise HTTPException(
            status_code=404, detail="No data matched the selected filters."
        )

    truncated = len(df) > MAX_ROWS_PER_EXPORT
    df = df.head(MAX_ROWS_PER_EXPORT)

    csv_buffer = io.StringIO()
    df.to_csv(csv_buffer, index=False)
    csv_bytes = csv_buffer.getvalue().encode("utf-8")

    area_slug = (
        (body.jurisdiction or body.county or "vermont").lower().replace(" ", "-")
    )
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
