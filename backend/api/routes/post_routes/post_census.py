from pathlib import Path

from fastapi import APIRouter, HTTPException

from api.models import FilterRequest, make_response
from app_utils import data_loading, timeseries_db
from app_utils.df_filtering import (
    filter_from_request,
    mass_filter_from_requests,
)
from app_utils.housing import housing_df_metric_dict

router = APIRouter()

# Fixed this path to four levels up to reach the Data directory
DATADIR = Path(__file__).parent.parent.parent.parent / "Data"
CENSUS_DATADIR = DATADIR / "Census"

# Maps (category, subcategory) to the timeseries_db view name.
# These subcategories are served via DuckDB instead of pandas/CSV.
_TIMESERIES_VIEWS: dict[tuple[str, str], str] = {
    ("housing", "median_home_value"): "median_home_value",
    ("housing", "median_smoc"): "median_smoc",
    ("economic", "median_earnings"): "median_earnings",
    ("economic", "unemployment_rate"): "unemployment_rate",
    ("economic", "commute_habits"): "commute_habits",
    ("economic", "commute_time"): "commute_time",
    ("demographic", "historic_population"): "historic_population",
}

CENSUS_DATASETS = {
    "housing": {
        "main": CENSUS_DATADIR / "VT_HOUSING_ALL.fgb",
        # time-series subcategories handled via _TIMESERIES_VIEWS / DuckDB
    },
    "economic": {
        "main": CENSUS_DATADIR / "VT_ECONOMIC_ALL.fgb",
        # time-series subcategories handled via _TIMESERIES_VIEWS / DuckDB
    },
    "demographic": {
        "main": CENSUS_DATADIR / "VT_DEMOGRAPHIC_ALL.fgb",
        # time-series subcategories handled via _TIMESERIES_VIEWS / DuckDB
    },
    "social": {"main": CENSUS_DATADIR / "VT_SOCIAL_ALL.fgb"},
}


# Load the Census "Main" Dataset by Cateogory (housing, economic, demographic, social)
@router.post("/load/census/{category}")
async def read_census_data(category: str, request: FilterRequest):
    if category not in CENSUS_DATASETS:
        raise HTTPException(
            status_code=404, detail=f"Census category '{category}' was not found"
        )

    data = data_loading.load_census_data(CENSUS_DATASETS[category]["main"])
    data = filter_from_request(data, request)
    metadata = {}

    return make_response(data, metadata)


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

    # Time-series subcategories are served via DuckDB
    ts_key = (category, subcategory)
    if ts_key in _TIMESERIES_VIEWS:
        view_name = _TIMESERIES_VIEWS[ts_key]
        filters = request.filters if request else None
        data = timeseries_db.query_timeseries(view_name, filters)
        if data.empty:
            raise HTTPException(
                status_code=404,
                detail=f"No data found for the given filters: {filters}",
            )
        return make_response(data, {})

    # FGB/CSV-backed subcategories (legacy path for any remaining non-timeseries)
    if subcategory not in CENSUS_DATASETS[category]:
        raise HTTPException(
            status_code=404,
            detail=f"Census subcategory '{subcategory}' was not found in category '{category}'",
        )

    data = data_loading.load_census_data(CENSUS_DATASETS[category][subcategory])
    data = filter_from_request(data, request)
    metadata = {}

    if data.empty:
        raise HTTPException(
            status_code=404,
            detail=f"No data found for the given filters: {request.filters if request else {}}",
        )

    return make_response(data, metadata)
