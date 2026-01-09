from pathlib import Path

from fastapi import APIRouter, HTTPException

from api.models.filter_models import FilterRequest
from app_utils import data_loading
from app_utils.df_filtering import (
    FilterState,
    filter_from_request,
    mass_filter_from_requests,
)
from app_utils.housing import housing_df_metric_dict

router = APIRouter()

# Fixed this path to four levels up to reach the Data directory
DATADIR = Path(__file__).parent.parent.parent.parent / "Data"
CENSUS_DATADIR = DATADIR / "Census"

CENSUS_DATASETS = {
    "housing": {
        "main": CENSUS_DATADIR / "VT_HOUSING_ALL.fgb",
        "median_home_value": CENSUS_DATADIR / "med_home_value_by_year.csv",
        "median_smoc": CENSUS_DATADIR / "med_smoc_by_year.csv",
    },
    "economic": {
        "main": CENSUS_DATADIR / "VT_ECONOMIC_ALL.fgb",
        "median_earnings": CENSUS_DATADIR / "median_earnings_by_year.csv",
        "unemployment_rate": CENSUS_DATADIR / "unemployment_rate_by_year.csv",
        "commute_habits": CENSUS_DATADIR / "commute_habits_by_year.csv",
        "commute_time": CENSUS_DATADIR / "commute_time_by_year.csv",
    },
    "demographic": {
        "main": CENSUS_DATADIR / "VT_DEMOGRAPHIC_ALL.fgb",
        "historic_population": CENSUS_DATADIR / "VT_Historic_Population.csv",
    },
    "social": {"main": CENSUS_DATADIR / "VT_SOCIAL_ALL.fgb"},
}


# Load the Census "Main" Dataset by Cateogory (housing, economic, demographic, social)
@router.post("/load/census/{category}")
async def read_census_data(category: str, request: FilterRequest):
    filter_dict = request.filters if request else {}
    if category not in CENSUS_DATASETS:
        raise HTTPException(
            status_code=404, detail=f"Census category '{category}' was not found"
        )

    data = data_loading.load_census_data(CENSUS_DATASETS[category]["main"])

    filters = FilterState(df=data, filter_columns=list(filter_dict.keys()))
    for col, value in filter_dict.items():
        filters.selections[col] = [value]  # type: ignore
    data_filtered = filters.apply_filters()

    if data_filtered.empty:
        raise HTTPException(
            status_code=404, detail=f"No data for given filters: {filter_dict}"
        )

    return data_filtered.to_json()


@router.post("/load/census/housing/snapshot")
async def get_housing_snapshot(request: FilterRequest):
    dfs = data_loading.masterload("census_housing")
    dfs = mass_filter_from_requests(dfs, request)
    metrics, plot_dfs = housing_df_metric_dict(dfs)

    # Convert metrics to JSON-serializable
    metrics_json = {k: float(v) if v is not None else None for k, v in metrics.items()}

    # Convert plot dataframes
    plot_data = {k: v.to_dict(orient="records") for k, v in plot_dfs.items()}

    response = {"metrics": metrics_json, "plot_data": plot_data}

    # Filter response if specific includes requested
    if request and request.include:
        filtered_response = {}
        if "metrics" in request.include:
            filtered_response["metrics"] = metrics_json

        # Filter plot_data to only included charts
        plot_includes = [i for i in request.include if i in plot_dfs]
        if plot_includes:
            filtered_response["plot_data"] = {k: plot_data[k] for k in plot_includes}

        return filtered_response

    return response


# Load the Census Dataset by `category`(housing, economic, etc.) and `subcategory`(special csv files)
@router.post("/load/census/{category}/{subcategory}")
async def read_census_data_subcat(
    category: str, request: FilterRequest, subcategory: str = "main"
):
    if category not in CENSUS_DATASETS:
        raise HTTPException(
            status_code=404, detail=f"Census category '{category}' was not found"
        )
    if subcategory not in CENSUS_DATASETS[category]:
        raise HTTPException(
            status_code=404,
            detail=f"Census subcategory '{subcategory}' was not found in category '{category}'",
        )

    data = data_loading.load_census_data(CENSUS_DATASETS[category][subcategory])
    data = filter_from_request(data, request)

    if data.empty:
        raise HTTPException(
            status_code=404,
            detail=f"No data found for the given filters: {request.filters if request else {}}",
        )

    return data.to_json()
