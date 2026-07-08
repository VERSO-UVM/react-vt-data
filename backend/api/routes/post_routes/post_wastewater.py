from fastapi import APIRouter, Response

from api.core_functions import request_to_source
from api.metadata_registry import get_metadata
from api.models import FilterRequest, make_response
from query import (
    get_waste_service_areas_geojson,
    get_waste_treatment_facility_geojson,
    get_waste_treatment_facility_permits,
    get_soil_suit_geojson,
)

router = APIRouter()

@router.post("/load/mapping/wastewater/service_area")
async def wastewater_service_geojson(request: FilterRequest):
    source = request_to_source(request, "service_areas_service_area_info", "default")
    data = get_waste_service_areas_geojson([source])
    return Response(content=data, media_type="application/json")

@router.post("/load/mapping/wastewater/treatment_facility")
async def wastewater_facility_geojson(request: FilterRequest):
    source = request_to_source(request, "treatment_facilities_treatment_facility_info", "default")
    data = get_waste_treatment_facility_geojson([source])
    return Response(content=data, media_type="application/json")

@router.post("/load/wastewater/zoning/facility_permits")
async def wastewater_facility_permits(request: FilterRequest):
    #TODO: the json table might be wrong, check later
    source = request_to_source(request, "treatment_facilities_treatment_facility_permit_info", "default")
    table = get_waste_treatment_facility_permits([source])
    return make_response(data=table, metadata=get_metadata("zoning"))

@router.post("/load/mapping/wastewater/septic_soil_suitability")
async def wastewater_soil_suit_geojson(request: FilterRequest):
    source = request_to_source(request, "soil_suitability_info_soil_suit", "default")
    data = get_soil_suit_geojson([source])
    return Response(content=data, media_type="application/json")