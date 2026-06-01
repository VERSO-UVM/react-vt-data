import logging

import pandas as pd
from fastapi import APIRouter

from api.metadata_registry import get_metadata
from api.models import DPSeriesRequest, FilterRequest, make_response
from app_utils.db import DB

logger = logging.getLogger(__name__)

router = APIRouter()


def _aggregate_to_state(df: pd.DataFrame) -> pd.DataFrame:
    """Aggregate county-level data to state level by summing Value and averaging Percent."""
    if df.empty:
        return df
    # Sum the Value column (population counts) and average the Percent column
    agg_dict = {}
    for col in df.columns:
        if col in ['year', 'Section', 'Variable']:
            agg_dict[col] = 'first'
        elif col == 'Value':
            agg_dict[col] = 'sum'
        elif col == 'Percent':
            agg_dict[col] = 'mean'

    result = df.groupby(['year', 'Section', 'Variable'],
                        as_index=False).agg(agg_dict)
    # Round percent to 1 decimal
    if 'Percent' in result.columns:
        result['Percent'] = result['Percent'].round(1)
    return result


# Demographics
@router.post("/load/acs5-db/tidy/demographics")
async def tidy_demographics(request: FilterRequest):
    # If requesting Vermont (state-level), aggregate all counties
    if request.name.lower() == "vermont":
        rows = DB.execute(
            """
            SELECT year, Section, Variable, Value, Percent
            FROM b10_census
            WHERE NAME LIKE '%County, Vermont'
              AND CAST(year AS INTEGER) BETWEEN ? AND ?
            ORDER BY year, Section, Variable
            """,
            [request.year_min, request.year_max],
        ).df()
        rows = _aggregate_to_state(rows)
    else:
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


# Education
@router.post("/load/acs5-db/tidy/education")
async def tidy_education(request: FilterRequest):
    if request.name.lower() == "vermont":
        rows = DB.execute(
            """
            SELECT year, Section, Variable, Value, Percent
            FROM b15003_education
            WHERE NAME LIKE '%County, Vermont'
              AND CAST(year AS INTEGER) BETWEEN ? AND ?
            ORDER BY year, Variable
            """,
            [request.year_min, request.year_max],
        ).df()
        rows = _aggregate_to_state(rows)
    else:
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


# Housing
@router.post("/load/acs5-db/tidy/housing")
async def tidy_housing(request: FilterRequest):
    if request.name.lower() == "vermont":
        rows = DB.execute(
            """
            SELECT year, Section, Variable, Value, Percent
            FROM b_housing
            WHERE NAME LIKE '%County, Vermont'
              AND CAST(year AS INTEGER) BETWEEN ? AND ?
            ORDER BY year, Variable
            """,
            [request.year_min, request.year_max],
        ).df()
        rows = _aggregate_to_state(rows)
    else:
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


# Labor Force
@router.post("/load/acs5-db/tidy/labor-force")
async def tidy_labor_force(request: FilterRequest):
    if request.name.lower() == "vermont":
        rows = DB.execute(
            """
            SELECT year, Section, Variable, Value, Percent
            FROM b_economic
            WHERE NAME LIKE '%County, Vermont'
              AND Section = 'Labor Force'
              AND CAST(year AS INTEGER) BETWEEN ? AND ?
            ORDER BY year, Variable
            """,
            [request.year_min, request.year_max],
        ).df()
        rows = _aggregate_to_state(rows)
    else:
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


# Income
@router.post("/load/acs5-db/tidy/income")
async def tidy_income(request: FilterRequest):
    if request.name.lower() == "vermont":
        rows = DB.execute(
            """
            SELECT year, Section, Variable, Value, Percent
            FROM b_economic
            WHERE NAME LIKE '%County, Vermont'
              AND Section = 'Income'
              AND CAST(year AS INTEGER) BETWEEN ? AND ?
            ORDER BY year, Variable
            """,
            [request.year_min, request.year_max],
        ).df()
        rows = _aggregate_to_state(rows)
    else:
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


# Unemployment Rate
@router.post("/load/acs5-db/tidy/unemployment-rate")
async def tidy_unemployment_rate(request: FilterRequest):
    if request.name.lower() == "vermont":
        rows = DB.execute(
            """
            SELECT year, NAME, Unemployment_Rate 
            FROM unemployment_rate
            WHERE NAME LIKE '%County, Vermont'
              AND CAST(year AS INTEGER) BETWEEN ? AND ?
            ORDER BY year, Unemployment_Rate
            """,
            [request.year_min, request.year_max],
        ).df()
        # Average unemployment rate across counties for state level
        if not rows.empty:
            rows = rows.groupby(['year'], as_index=False).agg({
                'Unemployment_Rate': 'mean',
                'NAME': 'first'
            })
    else:
        rows = DB.execute(
            """
            SELECT year, NAME, Unemployment_Rate 
            FROM unemployment_rate
            WHERE NAME = ?
              AND CAST(year AS INTEGER) BETWEEN ? AND ?
            ORDER BY year, Unemployment_Rate
            """,
            [request.name, request.year_min, request.year_max],
        ).df()
    return make_response(data=rows, metadata=get_metadata("unemployment_rate"))


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
