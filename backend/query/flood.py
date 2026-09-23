"""
**Description**:
    Functions for serving FEMA flood hazard data to the API from the database.
"""

from pathlib import Path

from api.models import FilterSource
from query.production_db import get_db
from query.sql_render import sql_filter_block

DB = get_db()
sql_dir = Path(__file__).resolve().parent / "sql" / "flood"


def get_flood_geojson(sources: list[FilterSource]):
    sql, params = sql_filter_block(sql_dir / "flood_geo_query.sql", sources)
    # Always one row: json_group_array over zero matches still aggregates.
    return DB.execute(sql, params).fetchone()[0]
