import logging

from fastapi import APIRouter

from api.metadata_registry import get_metadata
from api.models import DPSeriesRequest, FilterRequest, make_response
from app_utils.db import DB

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/load/acs5-db/tidy/demographics")
async def tidy_demographics(request: FilterRequest):
    rows = DB.execute(
        """
        SELECT year, Section, Variable, Value, Percent
        FROM b10_census
        WHERE NAME = ?
          AND CAST(year AS INTEGER) BETWEEN ? AND ?
        ORDER BY year, Section, Variable
        """,
        [request.name, request.year_min, request.year_max],
    ).df()
    return make_response(data=rows, metadata=get_metadata("demographics"))


@router.post("/load/acs5-db/tidy/education")
async def tidy_education(request: FilterRequest):
    rows = DB.execute(
        """
        SELECT year, Section, Variable, Value, Percent
        FROM b15003_education
        WHERE NAME = ?
          AND CAST(year AS INTEGER) BETWEEN ? AND ?
        ORDER BY year, Variable
        """,
        [request.name, request.year_min, request.year_max],
    ).df()
    return make_response(data=rows, metadata=get_metadata("education"))


@router.post("/load/acs5-db/tidy/housing")
async def tidy_housing(request: FilterRequest):
    rows = DB.execute(
        """
        SELECT year, Section, Variable, Value, Percent
        FROM b_housing
        WHERE NAME = ?
          AND CAST(year AS INTEGER) BETWEEN ? AND ?
        ORDER BY year, Variable
        """,
        [request.name, request.year_min, request.year_max],
    ).df()
    return make_response(data=rows, metadata=get_metadata("housing"))


@router.post("/load/acs5-db/tidy/labor-force")
async def tidy_labor_force(request: FilterRequest):
    rows = DB.execute(
        """
        SELECT year, Section, Variable, Value, Percent
        FROM b_economic
        WHERE NAME = ?
          AND Section = 'Labor Force'
          AND CAST(year AS INTEGER) BETWEEN ? AND ?
        ORDER BY year, Variable
        """,
        [request.name, request.year_min, request.year_max],
    ).df()
    return make_response(data=rows, metadata=get_metadata("labor_force"))


@router.post("/load/acs5-db/tidy/income")
async def tidy_income(request: FilterRequest):
    rows = DB.execute(
        """
        SELECT year, Section, Variable, Value, Percent
        FROM b_economic
        WHERE NAME = ?
          AND Section = 'Income'
          AND CAST(year AS INTEGER) BETWEEN ? AND ?
        ORDER BY year, Variable
        """,
        [request.name, request.year_min, request.year_max],
    ).df()
    return make_response(data=rows, metadata=get_metadata("income"))


# ---------------------------------------------------------------------------
# DP-series combined explorer (DP02 / DP03 / DP04 / DP05)
# ---------------------------------------------------------------------------


@router.get("/load/acs5-db/dp-combined/tree")
async def dp_combined_tree():
    """Return the global set of distinct cascade options across all DP tables."""
    rows = DB.execute(
        """
        SELECT DISTINCT "table", Category, Subcategory, Variable, Measure
        FROM dp_combined
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
        """
        SELECT CAST(year AS INTEGER) AS year,
               CAST(Value AS DOUBLE) AS Value
        FROM dp_combined
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
