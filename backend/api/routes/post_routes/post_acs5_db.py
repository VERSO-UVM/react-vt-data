import logging
from pathlib import Path

import duckdb
from fastapi import APIRouter
from pydantic import BaseModel

from api.metadata_registry import get_metadata
from api.models.filter_models import FilterRequest
from api.models.response_models import make_response


class DPSeriesRequest(BaseModel):
    name: str
    table: str
    category: str
    subcategory: str
    variable: str
    measure: str
    year_min: int = 2009
    year_max: int = 2024

logger = logging.getLogger(__name__)

router = APIRouter()

profile_census_path = (
    Path(__file__).resolve().parent
    / "../../../Data/Census/vt_acs5_combined_TIDY.parquet"
)
b10_census_path = (
    Path(__file__).resolve().parent
    / "../../../Data/Census/ACS_5/vt_acs5_b_demographics_tidy.parquet"
)
b15003_census_path = (
    Path(__file__).resolve().parent
    / "../../../Data/Census/ACS_5/vt_acs5_b_education_tidy.parquet"
)
b_housing_path = (
    Path(__file__).resolve().parent
    / "../../../Data/Census/ACS_5/vt_acs5_b_housing_tidy.parquet"
)
b_economic_path = (
    Path(__file__).resolve().parent
    / "../../../Data/Census/ACS_5/vt_acs5_b_economic_tidy.parquet"
)

logger.debug(f"ACS_5 profile_census_path = {profile_census_path}")
logger.debug(f"ACS_5 b10_census_path = {b10_census_path}")


DB = duckdb.connect()
DB.execute(
    f"CREATE VIEW profile_census AS SELECT * FROM read_parquet('{profile_census_path}')"
)
DB.execute(f"CREATE VIEW b10_census AS SELECT * FROM read_parquet('{b10_census_path}')")
DB.execute(f"CREATE VIEW b15003_education AS SELECT * FROM read_parquet('{b15003_census_path}')")
DB.execute(f"CREATE VIEW b_housing AS SELECT * FROM read_parquet('{b_housing_path}')")
DB.execute(f"CREATE VIEW b_economic AS SELECT * FROM read_parquet('{b_economic_path}')")


router = APIRouter()


@router.post("/load/acs5-db/tidy/demographics")
async def tidy_demographics(request: FilterRequest):
    b_rows = DB.execute(
        """
        SELECT year, Section, Variable, Value, Percent
        FROM b10_census
        WHERE NAME = ?
        AND CAST(year AS INTEGER) BETWEEN ? AND ?
        ORDER BY year, Section, Variable
    """,
        [request.name, request.year_min, request.year_max],
    ).df()
    metadata = get_metadata("demographics")
    return make_response(data=b_rows, metadata=metadata)


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
    metadata = get_metadata("education")
    return make_response(data=rows, metadata=metadata)


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
    metadata = get_metadata("housing")
    return make_response(data=rows, metadata=metadata)


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
    metadata = get_metadata("labor_force")
    return make_response(data=rows, metadata=metadata)


# Housing tenure endpoint removed — not needed (4.3)


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
    metadata = get_metadata("income")
    return make_response(data=rows, metadata=metadata)


# ---------------------------------------------------------------------------
# DP-series combined explorer (DP02 / DP03 / DP04 / DP05)
# ---------------------------------------------------------------------------


@router.get("/load/acs5-db/dp-combined/tree")
async def dp_combined_tree():
    """Return the global set of distinct cascade options across all DP tables.
    The result is location-independent (same 4,144 combos for every location)
    and is used to drive the cascading filter UI client-side.
    """
    rows = DB.execute(
        """
        SELECT DISTINCT "table", Category, Subcategory, Variable, Measure
        FROM profile_census
        ORDER BY "table", Category, Subcategory, Variable, Measure
        """
    ).df()
    return make_response(data=rows, metadata=None)


@router.post("/load/acs5-db/dp-combined/series")
async def dp_combined_series(request: DPSeriesRequest):
    """Return the annual time-series for a single (location, table, Category,
    Subcategory, Variable, Measure) selection.
    """
    rows = DB.execute(
        """
        SELECT CAST(year AS INTEGER) AS year,
               TRY_CAST(Value AS DOUBLE) AS Value
        FROM profile_census
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
