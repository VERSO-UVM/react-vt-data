"""
**Author**:
    Atticus Tarleton
**Created**:
    2026-07-20
**Description**:
    Functions for serving ambulance data to the API from the parquet files.
"""

import logging
from pathlib import Path

from api.models import FilterSource
from sql_render import sql_filter_block
from query.processed_db import DB

logger = logging.getLogger(__name__)
sql_dir = Path(__file__).resolve().parent / "sql" / "ambulance"

def get_ambulance_geojson(sources: list[FilterSource]):
    sql, params = sql_filter_block(sql_dir / "ambulance_geo_query.sql", sources)
    result = DB.execute(sql, params).fetchone()
    if result is None:
        logger.error("geo query returned no rows for filters: %s", sources)
        raise ValueError(f"no results for filters: {sources}")
    return result[0]