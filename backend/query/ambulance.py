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

import pandas as pd

from api.models import FilterSource
from query.production_db import get_db
from query.sql_render import sql_filter_block

DB = get_db()

logger = logging.getLogger(__name__)
sql_dir = Path(__file__).resolve().parent / "sql" / "ambulance"


def get_ambulance_geojson(sources: list[FilterSource]):
    sql, params = sql_filter_block(sql_dir / "ambulance_geo_query.sql", sources)
    result = DB.execute(sql, params).fetchone()
    if result is None:
        logger.error("geo query returned no rows for filters: %s", sources)
        raise ValueError(f"no results for filters: {sources}")
    return result[0]


def get_ambulance_legend():
    result = DB.execute(
        "SELECT json_group_array(to_json(VCGI_ambulanceService_colors)) FROM VCGI_ambulanceService_colors;"
    ).fetchone()
    if result is None:
        logger.error("color query returned no rows for the colors dataset")
        raise ValueError("no results for colors dataset")
    return result[0]


def get_ambulance_export_table() -> pd.DataFrame:
    """Load the full ambulance service table for CSV export.

    Renames `city` (the service's home town) to `Jurisdiction` so it lines
    up with the town-filter column name used by every other export source.
    There is no county-level column for this dataset.
    """
    df = DB.execute('SELECT * FROM "VCGI_ambulanceService_info"').df()
    return df.rename(columns={"city": "Jurisdiction"})
