from fastapi import APIRouter, Response

from api.core_functions import request_to_source
from api.models import FilterRequest
from query.parcels import get_parcels_geojson

router = APIRouter()


@router.post("/load/mapping/parcels")
async def read_parcels(request: FilterRequest):
    source = request_to_source(request, "parcels_info", "default")
    data = get_parcels_geojson([source])
    return Response(content=data, media_type="application/json")
