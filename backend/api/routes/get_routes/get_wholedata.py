import json
import logging
import os
from pathlib import Path

from fastapi import APIRouter

from query.production_db import get_db

DB = get_db()

logger = logging.getLogger(__name__)

router = APIRouter()

BACKEND_DIR = Path(__file__).resolve().parents[3]
DATA_DIR = Path(os.environ.get("DATA_DIR", BACKEND_DIR / "Data"))


# Orange → red gradient by FEMA zone type (all are SFHA high-risk).
# AE is by far the most common (~80 % of polygons); A is secondary.
_FLOOD_ZONE_COLORS: dict[str, list[int]] = {
    "A": [255, 140, 0, 195],  # amber — high-risk, no BFE
    "AE": [230, 60, 0, 205],  # orange-red — high-risk with BFE (most common)
    "AH": [200, 20, 0, 195],  # dark red — shallow ponding
    "AO": [255, 110, 0, 195],  # orange — shallow sheet flow
}
_FLOOD_DEFAULT_COLOR: list[int] = [220, 50, 0, 185]


def add_flood_color(gdf):
    gdf = gdf.copy()
    gdf["rgba_color"] = gdf["FLD_ZONE"].map(
        lambda z: _FLOOD_ZONE_COLORS.get(z, _FLOOD_DEFAULT_COLOR)
    )
    return gdf


@router.get("/")
def read_root():
    return {"Default Message": "No endpoint specified"}


# Flood Endpoint
@router.get("/load/mapping/flood_legal")
async def read_flood_data():
    result = DB.execute("""--sql
        SELECT
            *,
            ST_AsGeoJSON(geometry)::JSON AS geometry_json
        FROM FEMA_floodHazard_geom
    """).df()

    result = add_flood_color(result)

    features = []
    for _, row in result.iterrows():
        properties = row.drop(["geometry", "geometry_json"]).to_dict()
        features.append(
            {
                "type": "Feature",
                "geometry": json.loads(row["geometry_json"]),
                "properties": properties,
            }
        )

    return {
        "type": "FeatureCollection",
        "features": features,
    }


# VT Municipalities Endpoint
@router.get("/data/vermont/municipalities")
async def read_municipalities_data():
    with open(
        DATA_DIR / "vermont" / "municipalities.json", "r", encoding="utf-8"
    ) as file:
        data = json.load(file)
    return data
