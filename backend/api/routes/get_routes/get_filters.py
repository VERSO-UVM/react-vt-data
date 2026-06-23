import logging

from fastapi import APIRouter

from api.config import schema
from query import (
    filter_tree,
    # get_acs5_dp_combined_filters,
)

logger = logging.getLogger(__name__)
router = APIRouter()


# Schema Orientation: see design/current/Data_Engineering.md


def get_source_meta(primary_dataset: str, filter_dataset: str) -> dict:
    return (
        schema.get(primary_dataset, {}).get(filter_dataset)
        or schema["default"][filter_dataset]
    )


@router.get("/filters/schema")
async def get_schema(dataset: str) -> dict:
    all_sources = set(schema["default"]) | set(schema.get(dataset, {}))
    return {source: get_source_meta(dataset, source) for source in all_sources}


@router.get("/filters/tree")
async def filter_tree_endpoint(source: str, primary_dataset: str = "default"):
    """
    Get the JSON for a cascading filter on the primary_dataset WITH the 'source' as filter dataset.
    For now, the primary dataset is 'defauilt', which is the fallback for all non-specified datasets.


    Args:
        source (str): The dataset *doing the filtering*.
        primary_dataset (str): The dataset to be filtered.

    Returns:
        dict: a JSON dictionary of format
        key1: {values, each key2: values} and so on iteratively through the columns.
    """
    colmap: dict = schema[primary_dataset][source]["columns"]
    rangemap: dict = schema[primary_dataset][source].get("range", {})
    return filter_tree(colmap, list(colmap.keys()), source, rangemap=rangemap)


@router.get("/load/mapping/zoning/filters")
async def zoning_filters():
    colmap = schema["default"]["zoning_info"]["columns"]
    print(colmap)
    return filter_tree(colmap, list(colmap.keys()), "zoning_info")


# TODO: wireup so this actually gets used.
# @router.get("acs5-db/dp-combined/filters")
# async def dp_combined_filters():
#     return get_acs5_dp_combined_filters()
