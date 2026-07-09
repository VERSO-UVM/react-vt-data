"""
**Author**:
    Fitz Koch
**Created**:
    2026-06-01
**Description**:
    Functions for serving zoning_info data to the API from the parquet files.
"""

import logging
from pathlib import Path

import pandas as pd

from api.models import FilterSource
from query.processed_db import DB
from sql_render import sql_filter_block

logger = logging.getLogger(__name__)
sql_dir = Path(__file__).resolve().parent / "sql" / "zoning"


def get_zoning_geojson(sources: list[FilterSource]):
    sql, params = sql_filter_block(sql_dir / "geo_query.sql", sources)
    result = DB.execute(sql, params).fetchone()
    if result is None:
        logger.error("geo query returned no rows for filters: %s", sources)
        raise ValueError(f"no results for filters: {sources}")
    return result[0]


def get_zoning_rules(sources: list[FilterSource]) -> str:
    sql, params = sql_filter_block(sql_dir / "rules.sql", sources)
    result = DB.execute(sql, params).fetchone()
    if result is None:
        logger.error("rules query returned no rows for filters: %s", sources)
        raise ValueError(f"no results for filters: {sources}")
    return result[0]


def get_zoning_aggregated_acres(
    sources: list[FilterSource],
) -> tuple[pd.DataFrame, pd.DataFrame]:
    agg_sql, agg_params = sql_filter_block(sql_dir / "agg_info_table.sql", sources)
    agg_data = DB.execute(agg_sql, agg_params).df()

    table_sql, table_params = sql_filter_block(sql_dir / "info_table.sql", sources)
    table_data = DB.execute(table_sql, table_params).df()
    return agg_data, table_data


def get_zoning_allowances(
    sources: list[FilterSource],
) -> tuple[pd.DataFrame, pd.DataFrame]:
    agg = DB.execute(*sql_filter_block(sql_dir / "agg_rules_table.sql", sources)).df()
    table = DB.execute(*sql_filter_block(sql_dir / "rules_table.sql", sources)).df()

    return agg, table
