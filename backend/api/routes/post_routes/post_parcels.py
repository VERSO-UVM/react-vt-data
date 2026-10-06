from fastapi import APIRouter, Response

from api.core_functions import request_to_source, spec_to_source
from api.metadata_registry import get_metadata
from api.models import FilterRequest, FilterSpec, make_response
from query.parcels import (
    get_parcel_owners,
    get_parcel_value_per_acre,
    get_parcels_by_category,
    get_parcels_geojson,
    get_parcels_in_flood_zone,
)

router = APIRouter()


@router.post("/load/mapping/parcels/standard")
async def parcels_geojson(specs: list[FilterSpec]):
    sources = [spec_to_source(spec, "default") for spec in specs]
    data = get_parcels_geojson(sources)
    return Response(content=data, media_type="application/json")


@router.post("/load/data/parcels/by-category")
async def parcels_by_category(request: FilterRequest):
    source = request_to_source(request, "VCGIParcels_info", "default")
    agg, table = get_parcels_by_category([source])
    return make_response(data=agg, metadata=get_metadata("zoning"), tableData=table)


@router.post("/load/data/parcels/high-flood-risk")
async def parcels_high_flood_risk(request: FilterRequest):
    source = request_to_source(request, "VCGIParcels_info", "default")
    agg, table = get_parcels_in_flood_zone([source])
    return make_response(data=agg, metadata=get_metadata("zoning"), tableData=table)


@router.post("/load/data/parcels/value-per-acre")
async def parcels_value_per_acre(request: FilterRequest):
    source = request_to_source(request, "VCGIParcels_info", "default")
    agg, table = get_parcel_value_per_acre([source])
    return make_response(data=agg, metadata=get_metadata("zoning"), tableData=table)


@router.post("/load/data/parcels/owner-type")
async def parcels_owner_type(request: FilterRequest):
    source = request_to_source(request, "VCGIParcels_info", "default")
    agg, table = get_parcel_owners([source])
    return make_response(data=agg, metadata=get_metadata("zoning"), tableData=table)
