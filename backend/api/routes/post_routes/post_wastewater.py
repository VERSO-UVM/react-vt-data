from fastapi import APIRouter, Response

from api.core_functions import request_to_source
from api.metadata_registry import get_metadata
from api.models import FilterRequest, make_response
from query import (
    get_soil_suit_geojson,
    get_soil_suit_legend,
    get_waste_service_areas_geojson,
    get_waste_treatment_facility_geojson,
    get_waste_treatment_facility_permits,
    get_wastewater_export_table,
)

router = APIRouter()

# ---------------------------------------------------------------------------
# Export sources — merged into /export/sources by post_export.py. Adding a
# new wastewater table to the export tool only requires an entry here.
# ---------------------------------------------------------------------------

_WIM_DOCS = "https://verso-uvm.github.io/Wastewater-Infrastructure-Mapping/data.html"

EXPORT_SOURCES: dict[str, dict] = {
    "wastewater_service_areas": {
        "label": "Wastewater Service Areas",
        "group": "Infrastructure",
        "description": (
            "Municipal wastewater service area boundaries with system name, "
            "owner, and connected treatment facility. Geometry is excluded; "
            "use the Exploratory Mapping tab for map views."
        ),
        "primary_source": _WIM_DOCS,
        "loader": lambda: get_wastewater_export_table(
            "VersoWastewater_serviceAreas_info"
        ),
    },
    "wastewater_treatment_facilities": {
        "label": "Wastewater Treatment Facilities",
        "group": "Infrastructure",
        "description": (
            "Municipal and private wastewater treatment facilities with "
            "design hydraulic capacity and septage acceptance."
        ),
        "primary_source": _WIM_DOCS,
        "loader": lambda: get_wastewater_export_table(
            "VersoWastewater_treatmentFacilities_info"
        ),
    },
    "wastewater_treatment_facility_permits": {
        "label": "Wastewater Treatment Facility Permits",
        "group": "Infrastructure",
        "description": "NPDES discharge permits for wastewater treatment facilities.",
        "primary_source": _WIM_DOCS,
        "loader": lambda: get_wastewater_export_table(
            "VersoWastewater_treatmentFacilitiesPermits_info"
        ),
    },
    "wastewater_soil_suitability": {
        "label": "Septic Soil Suitability",
        "group": "Infrastructure",
        "description": (
            "Soil-based suitability for on-site septic systems, by mapped "
            "area and town. Geometry is excluded; use the Exploratory "
            "Mapping tab for map views."
        ),
        "primary_source": "https://github.com/VERSO-UVM/Vermont-Livability-Map",
        "loader": lambda: get_wastewater_export_table(
            "VersoWastewater_soilSuitability_info"
        ),
    },
    "wastewater_stormwater_management": {
        "label": "Stormwater Management Areas",
        "group": "Infrastructure",
        "description": "Permitted stormwater management system locations and status, by town.",
        "primary_source": _WIM_DOCS,
        "loader": lambda: get_wastewater_export_table(
            "VersoWastewater_stormwaterManagement_info"
        ),
    },
}


@router.post("/load/mapping/wastewater/service_area")
async def wastewater_service_geojson(request: FilterRequest):
    source = request_to_source(request, "VersoWastewater_serviceAreas_info", "default")
    data = get_waste_service_areas_geojson([source])
    return Response(content=data, media_type="application/json")


@router.post("/load/mapping/wastewater/treatment_facility")
async def wastewater_facility_geojson(request: FilterRequest):
    source = request_to_source(
        request, "VersoWastewater_treatmentFacilities_info", "default"
    )
    data = get_waste_treatment_facility_geojson([source])
    return Response(content=data, media_type="application/json")


@router.post("/load/mapping/wastewater/treatment_facility/permits")
async def wastewater_facility_permits(request: FilterRequest):
    # TODO: the json table might be wrong, check later
    source = request_to_source(
        request, "VersoWastewater_treatmentFacilitiesPermits_info", "default"
    )
    table = get_waste_treatment_facility_permits([source])
    return make_response(data=table, metadata=get_metadata("zoning"))


@router.post("/load/mapping/wastewater/septic_soil_suitability")
async def wastewater_soil_suit_geojson(request: FilterRequest):
    source = request_to_source(
        request, "VersoWastewater_soilSuitability_info", "default"
    )
    data = get_soil_suit_geojson([source])
    return Response(content=data, media_type="application/json")


@router.post("/load/mapping/wastewater/septic_soil_legend")
async def wastewater_soil_suit_legend():
    data = get_soil_suit_legend()
    return Response(content=data, media_type="application/json")
