import logging
from pathlib import Path

import duckdb
from fastapi import APIRouter
from models import FilterRequest

logger = logging.getLogger(__name__)

router = APIRouter()

PARQUET_PATH = Path("../Data/Census/vt_acs5_combined_TIDY.parquet")

TIDY_PARQUET = (
    Path(__file__).resolve().parent
    / "../../../Data/Census/ACS_5/vt_acs5_combined_TIDY.parquet"
)
logger.debug(f"ACS_5 TIDY_PARQUET_PATH = {TIDY_PARQUET}")

DB = duckdb.connect()
DB.execute(f"CREATE VIEW tidy_census AS SELECT * FROM read_parquet('/{TIDY_PARQUET}')")


router = APIRouter()


@router.post("/load/acs5-db/tidy/demographics")
def tidy_demographics(request: FilterRequest):
    category_clause = ""
    params = [request.name, request.year_min, request.year_max]

    if request.categories:
        placeholders = ", ".join(["?" for _ in request.categories])
        category_clause = f"AND Category IN ({placeholders})"
        params = (
            [request.name] + request.categories + [request.year_min, request.year_max]
        )

    measure_clause = "AND Measure = ?" if request.measure else ""
    if request.measure:
        params.insert(1, request.measure)  # after name

    rows = (
        DB.execute(
            f"""
        SELECT year, Category, Subcategory, Variable, Value, Measure
        FROM tidy_census
        WHERE NAME = ?
          AND "table" = '{request.table}'
          {measure_clause}
          AND CAST(year AS INTEGER) BETWEEN ? AND ?
          {category_clause}
        ORDER BY year, Category, Variable
    """,
            params,
        )
        .df()
        .to_dict(orient="records")
    )
    return rows
