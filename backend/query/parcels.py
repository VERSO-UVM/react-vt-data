"""
**Author**:
    Isaac Wedaman
**Created**:
    2026-07-23
**Description**:
    Something of note: this is a "girder" for the sql queries between
    the front end (website), and the backend database, with something to do with dbeaver as a goal in mind

"""

import logging
from pathlib import Path

import pandas as pd

from api.models import FilterSource
from query.core_functions import filter_tree
from query.processed_db import DB
from sql_render import sql_filter_block

# changed sql directory to parcels in the sql folder
logger = logging.getLogger(__name__)
sql_dir = Path(__file__).resolve().parent / "sql" / "parcels"


def get_parcels_geojson(sources: list[FilterSource]):
    sql, params = sql_filter_block(sql_dir / "geo_query_parcels.sql", sources)
    result = DB.execute(sql, params).fetchone()
    if result is None:
        logger.error("geo query returned no rows for filters: %s", sources)
        raise ValueError(f"no results for filters: {sources}")
    return result[0]


def get_parcels_table(
    sources: list[FilterSource],
) -> pd.DataFrame:
    table_sql, table_params = sql_filter_block(sql_dir / "info_table.sql", sources)
    table_data = DB.execute(table_sql, table_params).df()
    return table_data


def get_parcels_filters():
    PARCEL_FILTER_COLS = {
        "Town": "TOWN",
        "Category": "CAT",
        "Property Type": "PROPTYPE",
    }
    PARCEL_TREE_LABELS = ["Town", "Category"]
    return filter_tree(PARCEL_FILTER_COLS, PARCEL_TREE_LABELS, "parcels_info")
