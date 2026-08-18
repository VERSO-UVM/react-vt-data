import json
import logging

from fastapi import APIRouter

from app_utils import data_loading
from app_utils.flooding import add_flood_color

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/")
def read_root():
    return {"Default Message": "No endpoint specified"}


# Flood Endpoint (Hardcoded for now)
@router.get("/load/mapping/flood_legal")
async def read_flood_data():
    data = data_loading.masterload(name="flood_legal")
    # Re-apply zone-based colors at serve time so the static JSON
    # does not need to be regenerated when the color scheme changes.
    data = add_flood_color(data)
    return json.loads(data.to_json())


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
