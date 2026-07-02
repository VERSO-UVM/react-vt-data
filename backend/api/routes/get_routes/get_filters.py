import logging

from fastapi import APIRouter

from api.config import schema
from query import (
    filter_options,
    filter_tree,
    # get_acs5_dp_combined_filters,
)

logger = logging.getLogger(__name__)
router = APIRouter()


# Schema Orientation: see design/current/Data_Engineering.md
def get_filter_table_metadata(target_table: str, filter_table: str) -> dict:
    return (
        schema.get(target_table, {}).get(filter_table)
        or schema["default"][filter_table]
    )


@router.get("/filters/schema")
async def get_schema(target_table: str) -> dict:
    all_tables = set(schema["default"]) | set(schema.get(target_table, {}))
    return {
        filter_table: get_filter_table_metadata(target_table, filter_table)
        for filter_table in all_tables
    }


@router.get("/filters/tree")
async def filter_tree_endpoint(filter_table: str, target_table: str = "default"):
    """
    Get the JSON for a cascading filter on the target_table WITH the 'filter_table' as filter dataset.
    For now, the primary dataset is 'defauilt', which is the fallback for all non-specified datasets.


    Args:
        filter_table (str): The dataset *doing the filtering*.
        target_table (str): The dataset to be filtered.

    Returns:
        dict: a JSON dictionary of format
        key1: {values, each key2: values} and so on iteratively through the columns.
    """
    meta = get_filter_table_metadata(target_table, filter_table)
    colmap: dict = meta["columns"]
    rangemap: dict = meta.get("range", {})
    return filter_tree(colmap, list(colmap.keys()), filter_table, rangemap=rangemap)


@router.get("/filters/options")
async def filter_options_endpoint(filter_table: str, target_table: str = "default"):
    """
    Get the JSON for a option-based checkbox filter on the target_table WITH the 'filter_table' as filter dataset.
    For now, the primary dataset is 'default', which is the fallback for all non-specified datasets.


    Args:
        filter_table (str): The dataset *doing the filtering*.
        target_table (str): The dataset to be filtered.

    Returns:
        options -- structured like {label: [optionA, optionB]}
    """
    meta = get_filter_table_metadata(target_table, filter_table)
    colmap: dict = meta["columns"]
    return filter_options(colmap, list(colmap.keys()), filter_table)
