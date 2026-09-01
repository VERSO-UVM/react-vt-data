from fastapi import APIRouter, Response

from api.core_functions import request_to_source, spec_to_source
from api.models import FilterRequest, FilterSpec
from query import (
    get_ambulance_geojson,
    get_ambulance_legend,
)

router = APIRouter()


@router.post("/load/mapping/ambulance/service_area")
async def ambulance_info_geojson(request: FilterRequest):
    source = request_to_source(request, "ambulance_ambulance_info", "default")
    data = get_ambulance_geojson([source])
    return Response(content=data, media_type="application/json")


@router.post("/load/mapping/ambulance/service_area_new")
async def ambulance_info_geojson_new(specs: list[FilterSpec]):
    sources = [spec_to_source(spec, "default") for spec in specs]
    data = get_ambulance_geojson(sources)
    return Response(content=data, media_type="application/json")


@router.get("/load/mapping/ambulance/ambulance_legend")
async def ambulance_legend():
    data = get_ambulance_legend()
    return Response(content=data, media_type="application/json")
