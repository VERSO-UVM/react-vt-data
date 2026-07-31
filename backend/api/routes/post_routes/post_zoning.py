from fastapi import APIRouter, Response

from api.core_functions import request_to_source, spec_to_source
from api.metadata_registry import get_metadata
from api.models import FilterRequest, FilterSpec, make_response
from query.zoning import (
    get_unzoned_geojson,
    get_zoning_aggregated_acres,
    get_zoning_allowances,
    get_zoning_geojson,
)

router = APIRouter()

# TODO: currently these are using a little 'shim' to get around the fact that
# the frontend isn't actually sending FilterSources.
# the plan:
# build a function that converts a filter_request into the relevant filter_source
# convert all frontend logic to send a list of filter requests, and convert them all in first step.


@router.post("/load/mapping/zoning/standard_new")
async def zoning_geo_new(specs: list[FilterSpec]):
    sources = [spec_to_source(spec, "default") for spec in specs]
    data = get_zoning_geojson(sources)
    return Response(content=data, media_type="application/json")


@router.get("/load/mapping/zoning/unzoned")
async def zoning_unzoned():
    """Grey "no zoning information" backdrop. GET: it takes no filters."""
    data = get_unzoned_geojson()
    return Response(content=data, media_type="application/json")


@router.post("/load/mapping/zoning/standard")
async def zoning_geojson_info(request: FilterRequest):
    source = request_to_source(request, "zoning_info", "default")
    data = get_zoning_geojson([source])
    return Response(content=data, media_type="application/json")


@router.post("/load/data/zoning/aggregated")
async def acreage_response(request: FilterRequest):
    source = request_to_source(request, "zoning_info", "default")
    agg, table = get_zoning_aggregated_acres([source])
    return make_response(data=agg, metadata=get_metadata("zoning"), tableData=table)


@router.post("/load/data/zoning/allowances")
async def zoning_allowances(request: FilterRequest):
    source = request_to_source(request, "zoning_info", "default")
    agg, table = get_zoning_allowances([source])
    return make_response(
        data=agg,
        metadata=get_metadata("zoning"),
        tableData=table,
    )
