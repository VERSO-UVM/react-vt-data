from fastapi import APIRouter, Response

from api.core_functions import request_to_source, spec_to_source
from api.metadata_registry import get_metadata
from api.models import FilterRequest, FilterSpec, make_response
from query.zoning import (
    get_building_footprints,
    get_unzoned_geojson,
    get_zoning_aggregated_acres,
    get_zoning_allowances,
    get_zoning_export_table,
    get_zoning_geojson,
)

router = APIRouter()

# ---------------------------------------------------------------------------
# Export sources — merged into /export/sources by post_export.py. Adding a
# new zoning table to the export tool only requires an entry here.
# ---------------------------------------------------------------------------

EXPORT_SOURCES: dict[str, dict] = {
    "zoning_districts": {
        "label": "Zoning Districts",
        "group": "Land Use",
        "description": (
            "Vermont zoning district boundaries with district name, type "
            "(residential, mixed, nonresidential, overlay), and acreage. "
            "Geometry is excluded; use the Exploratory Mapping tab for map views."
        ),
        "primary_source": "https://geodata.vermont.gov/datasets/VCGI::vt-zoning-areas/about",
        "loader": lambda: get_zoning_export_table("VersoZoning_info"),
    },
    "zoning_bylaws": {
        "label": "Zoning Bylaw Standards",
        "group": "Land Use",
        "description": (
            "Dimensional and use standards (setbacks, density, lot size, "
            "parking, and more) for each zoning district, by housing form."
        ),
        "primary_source": "https://geodata.vermont.gov/datasets/VCGI::vt-zoning-areas/about",
        "loader": lambda: get_zoning_export_table("VersoZoning_wide"),
    },
}

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


# Unused by the frontend (it calls standard_new); disabled pending removal.
# @router.post("/load/mapping/zoning/standard")
# async def zoning_geojson_info(request: FilterRequest):
#     source = request_to_source(request, "VersoZoning_info", "default")
#     data = get_zoning_geojson([source])
#     return Response(content=data, media_type="application/json")


@router.post("/load/data/zoning/aggregated")
async def acreage_response(request: FilterRequest):
    source = request_to_source(request, "VersoZoning_info", "default")
    agg, table = get_zoning_aggregated_acres([source])
    return make_response(data=agg, metadata=get_metadata("zoning"), tableData=table)


@router.post("/load/data/zoning/allowances")
async def zoning_allowances(request: FilterRequest):
    source = request_to_source(request, "VersoZoning_info", "default")
    agg, table = get_zoning_allowances([source])
    return make_response(
        data=agg,
        metadata=get_metadata("zoning"),
        tableData=table,
    )


@router.post("/load/data/zoning/building-footprints")
async def building_footprints(request: FilterRequest):
    source = request_to_source(request, "VCGI_buildingFootprints_geom", "default")
    agg, table = get_building_footprints([source])
    return make_response(
        data=agg,
        metadata=get_metadata("zoning"),
        tableData=table,
    )
