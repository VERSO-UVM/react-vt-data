import logging
from pathlib import Path

import duckdb
from fastapi import APIRouter

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

logger.debug(f"ACS_5 profile_census_path = {profile_census_path}")
logger.debug(f"ACS_5 b10_census_path = {b10_census_path}")


DB = duckdb.connect()
DB.execute(
    f"CREATE VIEW profile_census AS SELECT * FROM read_parquet('{profile_census_path}')"
)
DB.execute(f"CREATE VIEW b10_census AS SELECT * FROM read_parquet('{b10_census_path}')")


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
    metadata = {}
    return make_response(data=b_rows, metadata=metadata)
