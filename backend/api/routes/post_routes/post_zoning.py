import json

from fastapi import APIRouter

from api.metadata_registry import get_metadata
from api.models import APIResponse, FilterRequest, make_response
from app_utils import data_loading, df_filtering

router = APIRouter()


@router.post("/load/mapping/zoning")
async def read_zoning_data(request: FilterRequest) -> APIResponse:
    df = data_loading.masterload(name="zoning")
    df = df_filtering.filter_from_request(df, request)
    metadata = get_metadata("zoning")
    table_data = None

    if request.format == "aggregated_acres":
        table_data = df.copy()  # leave raw data unfiltered
        result = (
            df.groupby("District Type")["Acres"]
            .sum()
            .reset_index()
            .rename(columns={"District Type": "District Type"})
        )
        result["hex_color"] = df.groupby("District Type")["hex_color"].first().values
        return make_response(result, metadata, table_data)

    # Default: return as GeoJSON so geometry is preserved for map rendering
    return APIResponse(data=json.loads(df.to_json()), tableData=None, metadata=metadata)
