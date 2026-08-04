"""
**Author**:
    Atticus Tarleton
**Created**:
    2026-07-06
**Description**:
    Functions for serving wastewater data to the API from the parquet files.
"""

import logging
import json
from pathlib import Path

import pandas as pd

from api.models import FilterSource
from sql_render import sql_filter_block
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
    if result is None:
        logger.error("geo query returned no rows for filters: %s", sources)
        raise ValueError(f"no results for filters: {sources}")
    return result[0]


def get_waste_treatment_facility_permits(sources: list[FilterSource]) -> pd.DataFrame:
    table_sql = sql_filter_block(sql_dir / "waste_treatment_permit_table.sql", sources)
    table_data = DB.execute(table_sql).df()

    return table_data


def get_soil_suit_geojson(sources: list[FilterSource]):
    sql, params = sql_filter_block(sql_dir / "soil_suitability_geo_query.sql", sources)
    result = DB.execute(sql, params).fetchone()
    if result is None:
        logger.error("geo query returned no rows for filters: %s", sources)
        raise ValueError(f"no results for filters: {sources}")
    return result[0]


## creating this for the legend
def get_soil_suit_legend():
    # result = DB.execute("select * from soil_suitability_soil_suitability_colors").fetchall()
    result = DB.execute(
        "SELECT json_group_array(to_json(soil_suitability_soil_suitability_colors)) FROM soil_suitability_soil_suitability_colors;"
    ).fetchall()
    if result is None:
        logger.error("color query returned no rows for filters: %s")
        raise ValueError("no results for colors dataset")
    # print(result)
    # print("\n\n")
    # json_result = json.dumps(result)
    # print(json_result)
    # return json_result
    # print(result[0][0])
    # print("\n\n")
    end_result = result[0][0].strip("[")
    end_result = end_result.strip("]")
    print(end_result)
    return end_result
