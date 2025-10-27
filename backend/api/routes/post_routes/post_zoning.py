

from fastapi import APIRouter, Body, HTTPException

from api.models.filter_models import FilterRequest
from app_utils import data_loading, df_filtering

router = APIRouter()


@router.post("/load/mapping/zoning")
async def read_zoning_data(request: FilterRequest = Body(None)):
    df = data_loading.masterload(name="zoning")

    if request.filters:
        filter_dict = request.filters

        # Optional: validate columns exist
        for col in filter_dict.keys():
            if col not in df.columns:
                raise HTTPException(status_code=400, detail=f"Column '{col}' does not exist")

        Filter = df_filtering.FilterState(df=df, filter_columns=list(filter_dict.keys()))
        Filter.set_filters(filter_dict)
        df = Filter.apply_filters(df)

    if request.format == "aggregated_acres":
        result = (
            df.groupby("District Type")["Acres"]
              .sum()
              .reset_index()
              .rename(columns={"District Type": "District Type"})
        )
        result["hex_color"] = df.groupby("District Type")["hex_color"].first().values
        return result.to_dict(orient="records")
    
    return df.to_json()