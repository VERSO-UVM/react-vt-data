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