"""
**Description**:
    Functions for serving VCGIParcels_* data to the API from the database.
"""

import logging
from pathlib import Path

from api.models import FilterSource
from query.production_db import get_db
from query.sql_render import sql_filter_block

DB = get_db()

logger = logging.getLogger(__name__)
sql_dir = Path(__file__).resolve().parent / "sql" / "parcels"


def get_parcels_geojson(sources: list[FilterSource]) -> str:
    sql, params = sql_filter_block(sql_dir / "geo_query.sql", sources)
    result = DB.execute(sql, params).fetchone()
    if result is None:
        logger.error("parcels geo query returned no rows for filters: %s", sources)
        raise ValueError(f"no results for filters: {sources}")
    return result[0]
