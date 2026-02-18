import logging
from pathlib import Path

import duckdb
from fastapi import APIRouter

logger = logging.getLogger(__name__)

router = APIRouter()

PARQUET_PATH = Path("../Data/Census/vt_acs5_combined_TIDY.parquet")

TIDY_PARQUET = (
    Path(__file__).resolve().parent
    / "../../../Data/Census/ACS_5/vt_acs5_combined_TIDY.parquet"
)
PARQUET = (
    Path(__file__).resolve().parent
    / "../../../Data/Census/ACS_5/vt_acs5_combined.parquet"
)
logger.debug(f"ACS_5 TIDY_PARQUET_PATH = {TIDY_PARQUET}")
logger.debug(f"ACS_5 TIDY_PARQUET_PATH = {PARQUET}")

DB = duckdb.connect()
DB.execute(f"CREATE VIEW tidy_census AS SELECT * FROM read_parquet('/{TIDY_PARQUET}')")
# DB.execute(f"CREATE VIEW reg_census AS SELECT * FROM read_parquet('/{PARQUET}')")


@router.get("/load/acs5-db/tidy/demographics")
def dirty_demographics(jurisdiction: str, year_min: int = 2010, year_max: int = 2023):
    rows = (
        DB.execute(
            """
        SELECT year, Category, Variable, Value
        FROM tidy_census
        WHERE JURISDICTION = ?
          AND "table" = 'DP05'
          AND Measure = 'Estimate'
          AND CAST(year as INTEGER) BETWEEN ? AND ?
        ORDER BY year
    """,
            [jurisdiction, year_min, year_max],
        )
        .df()
        .to_dict(orient="records")
    )
    return rows


@router.get("/load/acs5-db/reg/demographics")
def demographics(name: str, year_min: int = 2010, year_max: int = 2023):
    rows = (
        DB.execute(
            """
        SELECT year, Category, Variable, Value
        FROM tidy_census
        WHERE NAME = ?
          AND "table" = 'DP05'
          AND Measure = 'Estimate'
          AND CAST(year as INTEGER) BETWEEN ? AND ?
        ORDER BY year
    """,
            [name, year_min, year_max],
        )
        .df()
        .to_dict(orient="records")
    )
    return rows
