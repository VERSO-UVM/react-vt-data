from pathlib import Path

from fastapi import APIRouter, HTTPException

from api.models import FilterRequest, make_response
from app_utils import timeseries_db
from app_utils.df_filtering import (
    filter_from_request,
)
from query.processed_db import DB

router = APIRouter()

# Fixed this path to four levels up to reach the Data directory
DATADIR = Path(__file__).parent.parent.parent.parent / "Data"
CENSUS_DATADIR = DATADIR / "Census"


CENSUS_DATASETS = ["demographics", "economics", "housing", "social"]

# Maps (category, subcategory) to the timeseries_db view name.
# These subcategories are served via DuckDB instead of pandas/CSV.
_TIMESERIES_VIEWS: dict[tuple[str, str], str] = {
    ("demographics", "historic_population"): "VCGI_historicPopulation_timeseries",
    (
        "demographics",
        "age_dependency_ratio",
    ): "acs5Demographics_ageDependencyRatio_timeseries",
    ("demographics", "median_age"): "acs5Demographics_medianAge_timeseries",
    ("economics", "health_insurance"): "acs5Economics_healthInsurance_timeseries",
    ("economics", "household_income"): "acs5Economics_medianHouseholdIncome_timeseries",
    ("economics", "per_capita_income"): "acs5Economics_perCapitaIncome_timeseries",
    ("economics", "unemployment_rate"): "acs5Economics_unemploymentRate_timeseries",
    ("housing", "housing_units"): "acs5Housing_housingUnits_timeseries",
    ("housing", "median_home_value"): "acs5Housing_medianHomeValue_timeseries",
    ("housing", "vacancy_rates"): "acs5Demographics_vacancyRates_timeseries",
}


# Load the Census Dataset by `category`(housing, economic, etc.)
# and `subcategory`(special time series tables)
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

    # data = data_loading.load_census_data(CENSUS_DATASETS[category][subcategory])
    data = DB.execute(f"SELECT * FROM acs5_{category}_tidy")
    data = filter_from_request(data, request)
    metadata = {}

    if data.empty:
        raise HTTPException(
            status_code=404,
            detail=f"No data found for the given filters: {request.filters if request else {}}",
        )

    return make_response(data, metadata)
