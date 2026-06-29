from fastapi import APIRouter

from api.core_functions import request_to_source, spec_to_source
from api.models import FilterRequest, FilterSpec
from query import dual_var_geojson, single_var_geojson

router = APIRouter()


@router.post("/load/mapping/cdc/places/single")
async def cdc_single_geojson(request: FilterRequest):
    source = request_to_source(request, "cdc_places", "default")
    data = single_var_geojson([source])
    return data


@router.post("/load/mapping/cdc/places/double")
async def cdc_double_geojson(request: FilterRequest):
    source = request_to_source(request, "cdc_places", "default")
    data = dual_var_geojson([source])
    return data


@router.post("/load/mapping/cdc/places/double_new")
async def new_double_cdc(specs: list[FilterSpec]):
    sources = [spec_to_source(spec, "default") for spec in specs]
    data = dual_var_geojson(sources)
    return data
