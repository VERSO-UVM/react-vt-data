"""
**Author**:
    Atticus Tarleton
**Created**:
    2026-07-06
**Description**:
    Functions for serving wastewater data to the API from the database tables.
"""

import logging
from pathlib import Path

import pandas as pd

from api.models import FilterSource
from app_utils.sql_render import sql_filter_block
from query.processed_db import DB

logger = logging.getLogger(__name__)
sql_dir = Path(__file__).resolve().parent / "sql" / "wastewater"


def get_waste_service_areas_geojson(sources: list[FilterSource]):
    sql, params = sql_filter_block(sql_dir / "service_area_geo_query.sql", sources)
    result = DB.execute(sql, params).fetchone()
    if result is None:
        logger.error("geo query returned no rows for filters: %s", sources)
        raise ValueError(f"no results for filters: {sources}")
    return result[0]


def get_waste_treatment_facility_geojson(sources: list[FilterSource]):
    sql, params = sql_filter_block(sql_dir / "waste_treatment_geo_query.sql", sources)
    result = DB.execute(sql, params).fetchone()
    print(f"TREATMENT FACILITY GEOM RESULT: {result}")
    if result is None:
        logger.error("geo query returned no rows for filters: %s", sources)
        raise ValueError(f"no results for filters: {sources}")
    return result[0]


def get_waste_treatment_facility_permits(sources: list[FilterSource]) -> pd.DataFrame:
    table_sql = sql_filter_block(sql_dir / "waste_treatment_permit_table.sql", sources)
    table_data = DB.execute(table_sql).df()

    return table_data


def get_soil_suit_geojson(sources: list[FilterSource]):
    sql, params = sql_filter_block(
        sql_dir / "soil_suitability_geo_query.sql",
        sources,
    )

    result = DB.execute(sql, params).fetchone()
    if result is None:
        logger.error("geo query returned no rows for filters: %s", sources)
        raise ValueError(f"no results for filters: {sources}")
    return result[0]
