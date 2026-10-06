"""
**Description**:
    Functions for serving VCGIParcels_* data to the API from the database.
"""

import logging
from pathlib import Path

import pandas as pd

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


def get_parcels_by_category(
    sources: list[FilterSource],
) -> tuple[pd.DataFrame, pd.DataFrame]:
    agg = DB.execute(
        *sql_filter_block(sql_dir / "agg_category_table.sql", sources)
    ).df()
    table = DB.execute(*sql_filter_block(sql_dir / "category_table.sql", sources)).df()
    return agg, table


def get_parcels_in_flood_zone(
    sources: list[FilterSource],
) -> tuple[pd.DataFrame, pd.DataFrame]:
    agg = DB.execute(*sql_filter_block(sql_dir / "agg_flood_table.sql", sources)).df()
    table = DB.execute(*sql_filter_block(sql_dir / "flood_table.sql", sources)).df()
    return agg, table


def get_parcel_value_per_acre(
    sources: list[FilterSource],
) -> tuple[pd.DataFrame, pd.DataFrame]:
    agg = DB.execute(*sql_filter_block(sql_dir / "agg_value_table.sql", sources)).df()
    table = DB.execute(*sql_filter_block(sql_dir / "value_table.sql", sources)).df()
    return agg, table
