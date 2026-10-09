import json
import logging
import os
from functools import lru_cache
from pathlib import Path

from fastapi import APIRouter, Response

from query import get_flood_geojson

logger = logging.getLogger(__name__)

router = APIRouter()

BACKEND_DIR = Path(__file__).resolve().parents[3]
DATA_DIR = Path(os.environ.get("DATA_DIR", BACKEND_DIR / "Data"))

# Load the municipalities dataset into memory during initial startup
with open(DATA_DIR / "vermont" / "municipalities.json", "r", encoding="utf-8") as file:
    MUNICIPALITIES_DATA = json.load(file)


@router.get("/")
def read_root():
    return {"Default Message": "No endpoint specified"}


@lru_cache(maxsize=1)
def _flood_all() -> str:
    return get_flood_geojson([])


# Flood Endpoint
# Unfiltered legacy fetch — the filterable, tooltip-carrying query lives in
# query/flood.py (also used by the POST /load/mapping/flood_legal route in
# post_flood.py, which supports the mapping explorer's flood filters).
@router.get("/load/mapping/flood_legal")
def read_flood_data():
    return Response(content=_flood_all(), media_type="application/json")


# VT Municipalities Endpoint
@router.get("/data/vermont/municipalities")
def read_municipalities_data():
    return MUNICIPALITIES_DATA
