import json

from fastapi import APIRouter, Response

from api.metadata_registry import get_metadata
from api.models import APIResponse, FilterRequest, make_response
from app_utils import data_loading, df_filtering
from query.zoning import get_zoning_aggregated_acres, get_zoning_geojson

router = APIRouter()


@router.post("/load/mapping/zoning/standard")
async def zoning_geojson(request: FilterRequest):
    data = get_zoning_geojson(request.filters)
    return Response(content=data, media_type="application/json")


@router.post("load/data/zoning/aggregated")
async def acreage_response(request: FilterRequest):
    agg, table = get_zoning_aggregated_acres(request.filters)
    return make_response(data=agg, metadata=get_metadata("zoning"), tableData=table)
