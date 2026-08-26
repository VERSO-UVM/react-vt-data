import logging

from fastapi import APIRouter

from api.metadata_registry import get_metadata
from api.models import DPSeriesRequest, FilterRequest, make_response

# TODO: Simplify / Refactor this script using the new query folder functions
from query.acs5 import (
    get_acs5_tidy,
    get_acs5_timeseries,
)
from query.production_db import DB

logger = logging.getLogger(__name__)
router = APIRouter()


# TODO: Percents might need to be weighted averages instead of simple averages for statewide aggregation
# TODO: In DB, add an aggregated statewide VT row to each table for easier aggregation requests

# -----------------------------
# CENSUS TIDY FORMAT TABLES
# -----------------------------


# Demographics
@router.post("/load/acs5-db/tidy/demographics")
async def tidy_demographics(request: FilterRequest):
    rows = get_acs5_tidy(dataset="demographics", filters=request.filters)
    return make_response(data=rows, metadata=get_metadata("demographics"))


# Education
@router.post("/load/acs5-db/tidy/education")
async def tidy_education(request: FilterRequest):
    rows = get_acs5_tidy(dataset="education", filters=request.filters)
    return make_response(data=rows, metadata=get_metadata("education"))


# Housing
@router.post("/load/acs5-db/tidy/housing")
async def tidy_housing(request: FilterRequest):
    rows = get_acs5_tidy(dataset="housing", filters=request.filters)
    return make_response(data=rows, metadata=get_metadata("housing"))


# Economics
@router.post("/load/acs5-db/tidy/economics")
async def tidy_economics(request: FilterRequest):
    rows = get_acs5_tidy(dataset="economics", filters=request.filters)
    return make_response(data=rows, metadata=get_metadata("labor_force"))


# Labor Force (FIXME: broken)
@router.post("/load/acs5-db/tidy/labor-force")
async def tidy_labor_force(request: FilterRequest):
    rows = get_acs5_tidy(dataset="labor_force", filters=request.filters)
    return make_response(data=rows, metadata=get_metadata("labor_force"))


# Income (FIXME: broken)
@router.post("/load/acs5-db/tidy/income")
async def tidy_income(request: FilterRequest):
    rows = get_acs5_tidy(dataset="income", filters=request.filters)
    return make_response(data=rows, metadata=get_metadata("income"))


# -----------------------------
# CENSUS TIMESERIES TABLES
# -----------------------------


##### DEMOGRAPHICS #####
# Age Dependency Ratio
@router.post("/load/acs5-db/timeseries/demographics/age-dependency-ratio")
async def get_age_dependency_ratio(request: FilterRequest):
    rows = get_acs5_timeseries(
        category="demographics", dataset="age_dependency_ratio", filters=request.filters
    )
    return make_response(data=rows, metadata=get_metadata("demographics"))


# Median Age
@router.post("/load/acs5-db/timeseries/demographics/median-age")
async def get_median_age(request: FilterRequest):
    rows = get_acs5_timeseries(
        category="demographics", dataset="median_age", filters=request.filters
    )
    return make_response(data=rows, metadata=get_metadata("demographics"))


# Historic Population
@router.post("/load/acs5-db/timeseries/demographics/historic-population")
async def get_historic_population(request: FilterRequest):
    filters = {key: value for key, value in request.filters.items() if key != "year"}

    rows = get_acs5_timeseries(
        category="demographics",
        dataset="historic_population",
        filters=filters,
    )

    return make_response(data=rows, metadata=get_metadata("demographics"))


##### ECONOMICS #####
# Heath Insurance Coverage
@router.post("/load/acs5-db/timeseries/economics/health-insurance")
async def get_health_insurance(request: FilterRequest):
    rows = get_acs5_timeseries(
        category="economics", dataset="health_insurance", filters=request.filters
    )
    return make_response(data=rows, metadata=get_metadata("labor_force"))


# Median Household Income
@router.post("/load/acs5-db/timeseries/economics/median-hh-income")
async def get_household_income(request: FilterRequest):
    rows = get_acs5_timeseries(
        category="economics", dataset="household_income", filters=request.filters
    )
    return make_response(data=rows, metadata=get_metadata("income"))


# Per Capita Income
@router.post("/load/acs5-db/timeseries/economics/per-capita-income")
async def get_per_capita_income(request: FilterRequest):
    rows = get_acs5_timeseries(
        category="economics", dataset="per_capita_income", filters=request.filters
    )
    return make_response(data=rows, metadata=get_metadata("income"))


# Median Earnings (FIXME: broken)
@router.post("/load/acs5-db/timeseries/economics/median-earnings")
async def get_median_earnings(request: FilterRequest):
    rows = get_acs5_timeseries(
        category="economics", dataset="median_earnings", filters=request.filters
    )
    return make_response(data=rows, metadata=get_metadata("income"))


##### HOUSING #####
# Total Housing Units
@router.post("/load/acs5-db/timeseries/housing/total-units")
async def get_housing_units(request: FilterRequest):
    rows = get_acs5_timeseries(
        category="housing", dataset="housing_units", filters=request.filters
    )
    return make_response(data=rows, metadata=get_metadata("housing"))


# Median Home Value
@router.post("/load/acs5-db/timeseries/housing/median-home-value")
async def get_median_home_value(request: FilterRequest):
    rows = get_acs5_timeseries(
        category="housing", dataset="median_home_value", filters=request.filters
    )
    return make_response(data=rows, metadata=get_metadata("housing"))


# Vacancy Rates
@router.post("/load/acs5-db/timeseries/housing/vacancy-rates")
async def get_vacancy_rates(request: FilterRequest):
    rows = get_acs5_timeseries(
        category="housing", dataset="vacancy_rates", filters=request.filters
    )
    return make_response(data=rows, metadata=get_metadata("housing"))


# Geography Snapshot Variables
@router.post("/load/acs5-db/tidy/snapshot")
async def tidy_snapshot(request: FilterRequest):
    rows = get_acs5_tidy(dataset="snapshot", filters=request.filters)
    return make_response(data=rows, metadata=get_metadata("demographics"))


# ---------------------------------------------------------------------------
# DP-series combined explorer (DP02 / DP03 / DP04 / DP05)
# ---------------------------------------------------------------------------

# Summary fetch for data viewer snapshot


# @router.get("/load/summary")
# async def get_summary(location: str):
#     """Return a summary for the given loocation and variable list."""
#     variables = [
#         "Population (ACS)",
#         "Median Household Income",
#         "Median Home Value",
#         "Total Housing Units",
#     ]
#     total_housing_units = DB.execute()

#     return make_response(data=rows, metadata=None)


# TODO: Refactor this code to match zoning schema
@router.get("/load/acs5-db/dp-combined/tree")
async def dp_combined_tree():
    """Return the global set of distinct cascade options across all DP tables."""
    rows = DB.execute(
        """--sql
        SELECT DISTINCT "table", Category, Subcategory, Variable, Measure
        FROM acs5_dp_combined_tidy
        ORDER BY "table", Category, Subcategory, Variable, Measure
        """
    ).df()
    return make_response(data=rows, metadata=None)


@router.post("/load/acs5-db/dp-combined/series")
async def dp_combined_series(request: DPSeriesRequest):
    """Return the annual time-series for a single
    (location, table, Category, Subcategory, Variable, Measure) selection.
    """
    rows = DB.execute(
        """--sql
        SELECT CAST(year AS INTEGER) AS year,
               CAST(Value AS DOUBLE) AS Value
        FROM acs5_dp_combined_tidy
        WHERE NAME = ?
          AND "table" = ?
          AND Category = ?
          AND Subcategory = ?
          AND Variable = ?
          AND Measure = ?
          AND CAST(year AS INTEGER) BETWEEN ? AND ?
        ORDER BY year
        """,
        [
            request.name,
            request.table,
            request.category,
            request.subcategory,
            request.variable,
            request.measure,
            request.year_min,
            request.year_max,
        ],
    ).df()
    return make_response(data=rows, metadata=None)
