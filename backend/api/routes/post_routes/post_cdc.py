from fastapi import APIRouter

from api.core_functions import request_to_source
from api.models import FilterRequest
from query import get_cdc_geojson

router = APIRouter()


@router.post("/load/mapping/cdc/places")
async def cdc_geojson(request: FilterRequest):
    source = request_to_source(request, "cdc_places", "default")
    data = get_cdc_geojson([source])
    return data
