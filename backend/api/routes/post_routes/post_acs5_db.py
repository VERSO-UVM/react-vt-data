import logging
from pathlib import Path
import json

import duckdb
from fastapi import APIRouter
import numpy as np

from api.models.filter_models import FilterRequest

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

    return json.loads(b_rows.to_json(orient="records"))


async def tidy_demographic1s(request: FilterRequest):
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

    b10_rows = DB.execute(
        """
        SELECT year, Variable, Value, Percent
        FROM b10_census
        WHERE NAME = ?
        AND CAST(year AS INTEGER) BETWEEN ? AND ?
    """,
        [request.name, request.year_min, request.year_max],
    ).df()

    dp05_rows = DB.execute(
        f"""
        SELECT year, Category, Subcategory, Variable, Value, Measure
        FROM profile_census
        WHERE NAME = ?
          AND "table" = '{request.table}'
          {measure_clause}
          AND CAST(year AS INTEGER) BETWEEN ? AND ?
          {category_clause}
        AND CAST(Value AS FLOAT) BETWEEN 0 AND 100

        ORDER BY year, Category, Variable
    """,
        params,
    ).df()
    return {
        # "age_sex": [{2009: "No"}],
        "age_sex": json.loads((b10_rows).to_json(orient="records")),
        "race": json.loads((dp05_rows).to_json(orient="records")),
    }

    # @router.post("/load/acs5-db/tidy/demographics")
    # async def tidy_demographics(request: FilterRequest):
    #     category_clause = ""
    #     params = [request.name, request.year_min, request.year_max]

    #     if request.categories:
    #         placeholders = ", ".join(["?" for _ in request.categories])
    #         category_clause = f"AND Category IN ({placeholders})"
    #         params = (
    #             [request.name] + request.categories + [request.year_min, request.year_max]
    #         )

    #     measure_clause = "AND Measure = ?" if request.measure else ""
    #     if request.measure:
    #         params.insert(1, request.measure)  # after name

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
        AND CAST(Value AS FLOAT) BETWEEN 0 AND 100

        ORDER BY year, Category, Variable
    """,
            params,
        )
        .df()
        .to_dict(orient="records")
    )
    return rows
