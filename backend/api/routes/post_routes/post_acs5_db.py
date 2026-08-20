import logging

from fastapi import APIRouter

from api.metadata_registry import get_metadata
from api.models import DPSeriesRequest, FilterRequest, make_response

# TODO: Simplify / Refactor this script using the new query folder functions
from query.acs5 import (
    get_acs5_tidy,
    get_median_earnings,
    get_snapshot,
    get_unemployment_rate_ts,
)
from query.processed_db import DB

logger = logging.getLogger(__name__)
router = APIRouter()


# TODO: Percents might need to be weighted averages instead of simple averages for statewide aggregation
# TODO: In DB, add an aggregated statewide VT row to each table for easier aggregation requests


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


@router.post("/load/acs5-db/tidy/housing")
async def tidy_housing(request: FilterRequest):
    rows = get_acs5_tidy(dataset="housing", filters=request.filters)
    return make_response(data=rows, metadata=get_metadata("housing"))


# Labor Force
@router.post("/load/acs5-db/tidy/labor-force")
async def tidy_labor_force(request: FilterRequest):
    rows = get_acs5_tidy(dataset="labor_force", filters=request.filters)
    return make_response(data=rows, metadata=get_metadata("labor_force"))


# Income
@router.post("/load/acs5-db/tidy/income")
async def tidy_income(request: FilterRequest):
    rows = get_acs5_tidy(dataset="income", filters=request.filters)
    return make_response(data=rows, metadata=get_metadata("income"))


# Median Age
@router.post("/load/acs5-db/tidy/demographics/median-age")
async def tidy_median_age(request: FilterRequest):
    rows = get_acs5_tidy(dataset="demographics", filters=request.filters)
    return make_response(data=rows, metadata=get_metadata("demographics"))


# Unemployment Rate
@router.post("/load/acs5-db/tidy/unemployment-rate")
async def tidy_unemployment_rate(request: FilterRequest):
    rows = get_unemployment_rate_ts(filters=request.filters)
    return make_response(data=rows, metadata=get_metadata("unemployment_rate"))


# Median Earnings (FIXME)
@router.post("/load/acs5-db/tidy/median-earnings")
async def tidy_median_earnings(request: FilterRequest):
    rows = get_median_earnings(filters=request.filters)
    return make_response(data=rows, metadata=get_metadata("median_earnings"))


# Geography Snapshot Variables (FIXME)
@router.post("/load/acs5-db/tidy/snapshot")
async def tidy_snapshot(request: FilterRequest):
    rows = get_snapshot(filters=request.filters)
    return make_response(data=rows, metadata=get_metadata("snapshot"))


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
        FROM acs5_dp_combined
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
        FROM acs5_dp_combined
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
