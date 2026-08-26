import json
import logging

from fastapi import APIRouter

from app_utils import data_loading
from app_utils.flooding import add_flood_color
from query.production_db import DB

logger = logging.getLogger(__name__)

router = APIRouter()


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


# Soil Septic Endpoint (Hardcoded for now)
@router.get("/load/mapping/wastewater/soil_septic/{rpc}")
async def read_soil_septic_data(rpc):
    data = data_loading.load_and_process_soil_septic(rpc=rpc)
    return json.loads(data.to_json())


# Wastewater Treatment Facilities (WWTF) Endpoint (Hardcoded for now)
@router.get("/load/mapping/wastewater/treatment_facilities")
async def read_WWTF_data():
    data = data_loading.masterload(name="WWTF")
    return json.loads(data.to_json())


# Wastewater Service Areas (WWTF) Endpoint (Hardcoded for now)
@router.get("/load/mapping/wastewater/service_areas")
async def read_service_areas():
    data = data_loading.masterload(name="service_areas")
    return json.loads(data.to_json())


# Zoning GET Endpoint (Hardcoded for now)
@router.get("/load/mapping/zoning/standard")
async def read_zoning_data():
    data = data_loading.masterload(name="zoning")
    return json.loads(data.to_json())
