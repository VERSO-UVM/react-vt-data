from fastapi import APIRouter

from api.core_functions import request_to_source, spec_to_source
from api.models import APIResponse, FilterRequest, FilterSpec, make_response
from query import dual_var_comparison, get_cdc_county_pca, single_var_geojson

router = APIRouter()


@router.post("/load/mapping/cdc/places/single")
async def cdc_single_geojson(request: FilterRequest):
    source = request_to_source(request, "cdc_places_county", "default")
    data = single_var_geojson([source])
    return data


@router.post("/load/mapping/cdc/places/county_comparison")
async def cdc_comparison(specs: list[FilterSpec]) -> APIResponse:
    """Bivariate comparison map: geojson in `data`, legend in `metadata`.

    One response so the legend grid is guaranteed to match the map colors
    (both are computed from the same cmap in one pass).
    """
    sources = [spec_to_source(spec, "default") for spec in specs]
    geojson, legend = dual_var_comparison(sources, geoLevel="county_places")
    return make_response(data=geojson, metadata={"legend": legend})


@router.post("/load/mapping/cdc/places/tract_comparison")
async def cdc_comparison_tract(specs: list[FilterSpec]) -> APIResponse:
    """Bivariate comparison map: geojson in `data`, legend in `metadata`.

    One response so the legend grid is guaranteed to match the map colors
    (both are computed from the same cmap in one pass).
    """
    sources = [spec_to_source(spec, "default") for spec in specs]
    geojson, legend = dual_var_comparison(sources, geoLevel="tract_places")
    return make_response(data=geojson, metadata={"legend": legend})


# (FIXME)
@router.post("/load/mapping/cdc/places/pca_summary")
async def cdc_pca(specs: list[FilterSpec]) -> APIResponse:
    return make_response(data=get_cdc_county_pca(), metadata={})
