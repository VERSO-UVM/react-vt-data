import json
import logging
import os
from pathlib import Path

from fastapi import APIRouter, Response

from query.production_db import get_db

DB = get_db()

logger = logging.getLogger(__name__)

router = APIRouter()

BACKEND_DIR = Path(__file__).resolve().parents[3]
DATA_DIR = Path(os.environ.get("DATA_DIR", BACKEND_DIR / "Data"))


@router.get("/")
def read_root():
    return {"Default Message": "No endpoint specified"}


# Flood Endpoint
@router.get("/load/mapping/flood_legal")
async def read_flood_data():
    result = DB.execute("""--sql
        SELECT
            JSON_OBJECT(
                'type', 'FeatureCollection',
                'features', JSON_GROUP_ARRAY(JSON_OBJECT(
                    'type', 'Feature',
                    'geometry', ST_ASGEOJSON(geometry)::JSON,
                    'properties', JSON_OBJECT(
                        'flood_zone_type', flood_zone_type,
                        'zone_subtype', zone_subtype,
                        'base_flood_elevation', base_flood_elevation,
                        'rgba_color', rgba_color,
                        'flood_risk', flood_risk,
                        'special_flood_hazard_zone', special_flood_hazard_zone
                    )
                ))
            )::VARCHAR
        FROM FEMA_floodHazard_geom
    """).fetchone()

    return Response(content=result[0], media_type="application/json")


# VT Municipalities Endpoint
@router.get("/data/vermont/municipalities")
async def read_municipalities_data():
    with open(
        DATA_DIR / "vermont" / "municipalities.json", "r", encoding="utf-8"
    ) as file:
        data = json.load(file)
    return data
