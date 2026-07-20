from fastapi import APIRouter, Response

from api.core_functions import request_to_source
from api.models import FilterRequest
from query import (
    get_ambulance_geojson,
)

router = APIRouter()


@router.post("/load/mapping/ambulance/service_area")
async def ambulance_info_geojson(request: FilterRequest):
    source = request_to_source(request, "ambulance_ambulance_info", "default")
    data = get_ambulance_geojson([source])
    return Response(content=data, media_type="application/json")