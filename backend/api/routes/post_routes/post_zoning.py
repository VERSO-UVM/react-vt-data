from fastapi import APIRouter

from api.models import APIResponse, FilterRequest, make_response
from app_utils import data_loading, df_filtering

router = APIRouter()


def get_zoning_metadata() -> dict:
    ## TODO: transition this to pull from an updated registry of metadata
    return {
        "source": "Municipal Zoning Records",
        "lastUpdated": "2024-12",  # or pull from df/file timestamp
        "caveats": ["Aggregate district types may overlap in some municipalities"],
    }


@router.post("/load/mapping/zoning")
async def read_zoning_data(request: FilterRequest) -> APIResponse:
    df = data_loading.masterload(name="zoning")
    df = df_filtering.filter_from_request(df, request)
    metadata = get_zoning_metadata()
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
        df = result

    return make_response(df, metadata, table_data)
