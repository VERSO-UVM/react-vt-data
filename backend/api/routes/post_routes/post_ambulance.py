from fastapi import APIRouter, Response

from api.core_functions import request_to_source, spec_to_source
from api.models import FilterRequest, FilterSpec
from query import (
    get_ambulance_export_table,
    get_ambulance_geojson,
    get_ambulance_legend,
)

router = APIRouter()

# ---------------------------------------------------------------------------
# Export sources — merged into /export/sources by post_export.py. Adding a
# new ambulance table to the export tool only requires an entry here.
# ---------------------------------------------------------------------------

EXPORT_SOURCES: dict[str, dict] = {
    "ambulance_service_areas": {
        "label": "Ambulance Services",
        "group": "Infrastructure",
        "description": (
            "Licensed ambulance service providers with certification level, "
            "transport volume, and cost per transport. Geometry is excluded; "
            "use the Exploratory Mapping tab for map views."
        ),
        "primary_source": (
            "https://services1.arcgis.com/BkFxaEFNwHqX3tAw/arcgis/rest/services/"
            "FS_VCGI_OPENDATA_Emergency_AmbulanceServiceAreas_SP_v1/FeatureServer/0"
        ),
        "loader": get_ambulance_export_table,
    },
}


@router.post("/load/mapping/ambulance/service_area")
async def ambulance_info_geojson(request: FilterRequest):
    source = request_to_source(request, "VCGI_ambulanceService_info", "default")
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
