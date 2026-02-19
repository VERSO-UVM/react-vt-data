import logging
from pathlib import Path

import duckdb
from fastapi import APIRouter

from api.metadata_registry import get_metadata
from api.models.filter_models import FilterRequest
from api.models.response_models import make_response

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


@router.post("/load/acs5-db/tidy/housing/tenure")
async def tidy_housing_tenure(request: FilterRequest):
    import pandas as pd

    rows = DB.execute(
        """
        SELECT year, Variable, Value, Percent
        FROM b_housing
        WHERE NAME = ?
        AND Variable IN ('Renter-Occupied Units', 'Total Housing Units')
        AND CAST(year AS INTEGER) BETWEEN ? AND ?
        ORDER BY year, Variable
    """,
        [request.name, request.year_min, request.year_max],
    ).df()

    # Derive Owner-Occupied Units = Total - Renter, with percentages.
    owner_rows = []
    for year in rows["year"].unique():
        yr = rows[rows["year"] == year]
        total_s = yr[yr["Variable"] == "Total Housing Units"]["Value"].values
        renter_s = yr[yr["Variable"] == "Renter-Occupied Units"]["Value"].values
        if len(total_s) == 0 or len(renter_s) == 0:
            continue
        total_val = float(total_s[0])
        renter_val = float(renter_s[0])
        owner_val = total_val - renter_val
        pct = round(owner_val / total_val * 100, 1) if total_val > 0 else None
        owner_rows.append(
            {"year": year, "Variable": "Owner-Occupied Units", "Value": owner_val, "Percent": pct}
        )

    if owner_rows:
        rows = pd.concat([rows, pd.DataFrame(owner_rows)], ignore_index=True)

    metadata = get_metadata("housing")
    return make_response(data=rows, metadata=metadata)


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
