"""
**Author**:
    Fitz Koch
**Created**:
    2026-06-01
**Description**:
    Functions for serving zoning data to the API from the parquet files.
"""

import logging
from pathlib import Path

import pandas as pd

from query.core_functions import build_where_query_from_filters, filter_tree
from query.processed_db import DB

logger = logging.getLogger(__name__)
sql_path = Path(__file__).resolve().parent / "sql" / "zoning"

# fronted filter label -> real zoning column
ZONING_FILTER_COLS = {
    "County": "County",
    "RPC": "RPC",
    "Jurisdiction": "Municipal_Name",
    "District Name": "District_Name",
    "District Type": "District_Type",
}

ZONING_TREE_LABELS = ["County", "Jurisdiction", "District Name"]


def get_zoning_geojson(filters: dict | None = None) -> str:
    where_string = build_where_query_from_filters(filters, ZONING_FILTER_COLS, "zoning")
    result = DB.execute(
        (sql_path / "geo_query.sql").read_text().format(where_string=where_string)
    ).fetchone()
    if result is None:
        logger.error("geo query returned no rows for filters: %s", filters)
        raise ValueError(f"no results for filters: {filters}")
    return result[0]


def get_zoning_filters():
    return filter_tree(ZONING_FILTER_COLS, ZONING_TREE_LABELS, "zoning_info")


def get_zoning_aggregated_acres(
    filters: dict | None = None,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    where_string = build_where_query_from_filters(filters, ZONING_FILTER_COLS, "zoning")
    agg_data = DB.execute(
        (sql_path / "agg_info_table.sql").read_text().format(where_string=where_string)
    ).df()
    table_data = DB.execute(
        (sql_path / "info_table.sql").read_text().format(where_string=where_string)
    ).df()
    return agg_data, table_data
