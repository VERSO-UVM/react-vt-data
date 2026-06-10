from fastapi import APIRouter, Response

from api.core_functions import request_to_source
from api.metadata_registry import get_metadata
from api.models import FilterRequest, make_response
from query import get_zoning_aggregated_acres, get_zoning_geojson

router = APIRouter()

# TODO: currently these are using a little 'shim' to get around the fact that
## the frontend isn't actually sending FilterSources.
## the plan:
#### build a function that converts a filter_request into the relevant filter_source
#### convert all frontend logic to send a list of filter requests, and convert them all in first step.


@router.post("/load/mapping/zoning/standard")
async def zoning_geojson(request: FilterRequest):
    source = request_to_source(request, "default", "zoning_info")
    data = get_zoning_geojson([source])
    return Response(content=data, media_type="application/json")


@router.post("/load/data/zoning/aggregated")
async def acreage_response(request: FilterRequest):
    source = request_to_source(request, "default", "zoning_info")
    agg, table = get_zoning_aggregated_acres([source])
    return make_response(data=agg, metadata=get_metadata("zoning"), tableData=table)
