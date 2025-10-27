
from pathlib import Path

from fastapi import APIRouter, HTTPException

from api.models.filter_models import FilterRequest
from app_utils import data_loading
from app_utils.df_filtering import FilterState

router = APIRouter()


DATADIR = Path(__file__).parent / "Data"
CENSUS_DATADIR = DATADIR / "Census"

CENSUS_DATASETS = {
    "housing": {
        "main": CENSUS_DATADIR / "VT_HOUSING_ALL.fgb",
        "median_home_value": CENSUS_DATADIR / "med_home_value_by_year.csv",
        "median_smoc": CENSUS_DATADIR / "med_smoc_by_year.csv"
    },
    "economic": {
        "main": CENSUS_DATADIR / "VT_ECONOMIC_ALL.fgb",
        "median_earnings": CENSUS_DATADIR / "median_earnings_by_year.csv",
        "unemployment_rate": CENSUS_DATADIR / "unemployment_rate_by_year.csv",
        "commute_habits": CENSUS_DATADIR / "commute_habits_by_year.csv",
        "commute_time": CENSUS_DATADIR / "commute_time_by_year.csv"
    },
    "demographic": {
        "main": CENSUS_DATADIR / "VT_DEMOGRAPHIC_ALL.fgb",
        "historic_population": CENSUS_DATADIR / "VT_Historic_Population.csv"
    },
    "social": {
        "main": CENSUS_DATADIR / "VT_SOCIAL_ALL.fgb"
    }
}

# Load the Census "Main" Dataset by Cateogory (housing, economic, demographic, social)
@router.post("/load/census/{category}")
async def read_census_data(category: str, request: FilterRequest = None):
    filter_dict = request.filter_dict if request else {}
    if category not in CENSUS_DATASETS:
        raise HTTPException(
            status_code=404, detail=f"Census category '{category}' was not found")

    data = data_loading.load_census_data(
        CENSUS_DATASETS[category]["main"])

    filters = FilterState(df=data, filter_columns=list(filter_dict.keys()))
    for col, value in filter_dict.items():
        filters.selections[col] = [value]
    data_filtered = filters.apply_filters()

    if data_filtered.empty:
        raise HTTPException(
            status_code=404, detail=f"No data for given filters: {filter_dict}")

    return data_filtered.to_json()


# Load the Census Dataset by `category`(housing, economic, etc.) and `subcategory`(special csv files)
@router.post("/load/census/{category}/{subcategory}")
async def read_census_data_subcat(category: str, subcategory: str = 'main', request: FilterRequest = None):
    filter_dict = request.filter_dict if request else {}
    if category not in CENSUS_DATASETS:
        raise HTTPException(
            status_code=404, detail=f"Census category '{category}' was not found")
    if subcategory not in CENSUS_DATASETS[category]:
        raise HTTPException(
            status_code=404, detail=f"Census subcategory '{subcategory}' was not found in category '{category}'")

    data = data_loading.load_census_data(
        CENSUS_DATASETS[category][subcategory])

    filters = FilterState(df=data, filter_columns=list(filter_dict.keys()))

    for col, value in filter_dict.items():
        filters.selections[col] = [value]

    data_filtered = filters.apply_filters()

    if data_filtered.empty:
        raise HTTPException(
            status_code=404, detail=f"No data found for the given filters: {filter_dict}")

    return data_filtered.to_json()
