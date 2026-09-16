from fastapi import APIRouter, Response

from api.core_functions import spec_to_source
from api.models import FilterSpec
from query.parcels import get_parcels_geojson

router = APIRouter()


@router.post("/load/mapping/parcels/standard")
async def parcels_geojson(specs: list[FilterSpec]):
    sources = [spec_to_source(spec, "default") for spec in specs]
    data = get_parcels_geojson(sources)
    return Response(content=data, media_type="application/json")
