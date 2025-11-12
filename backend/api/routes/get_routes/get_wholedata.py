import json
import logging

from fastapi import APIRouter

from app_utils import data_loading

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/")
def read_root():
    return {"Default Message": "No endpoint specified"}


# Flood Endpoint (Hardcoded for now)
@router.get("/load/mapping/flood_legal")
async def read_flood_data():
    data = data_loading.masterload(name="flood_legal")
    return json.loads(data.to_json())


# Soil Septic Endpoint (Hardcoded for now)
@router.get("/load/mapping/soil_septic/{rpc}")
async def read_soil_septic_data(rpc):
    data = data_loading.load_and_process_soil_septic(rpc=rpc)
    return json.loads(data.to_json())


# Wastewater Treatment Facilities (WWTF) Endpoint (Hardcoded for now)
@router.get("/load/mapping/wastewater")
async def read_WWTF_data():
    data = data_loading.masterload(name="WWTF")
    return json.loads(data.to_json())


# Zoning GET Endpoint (Hardcoded for now)
@router.get("/load/mapping/zoning")
async def read_zoning_data():
    data = data_loading.masterload(name="zoning")
    return json.loads(data.to_json())
