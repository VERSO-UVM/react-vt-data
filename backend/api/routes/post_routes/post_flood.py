from fastapi import APIRouter, Response

from api.core_functions import request_to_source
from api.models import FilterRequest
from query import get_flood_geojson

router = APIRouter()


@router.post("/load/mapping/flood_legal")
async def flood_geojson(request: FilterRequest):
    source = request_to_source(request, "FEMA_floodHazard_geom", "default")
    data = get_flood_geojson([source])
    return Response(content=data, media_type="application/json")
