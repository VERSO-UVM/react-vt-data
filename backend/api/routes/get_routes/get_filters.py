import logging

from fastapi import APIRouter

from api.config import schema
from query import (
    filter_tree,
    get_acs5_dp_combined_filters,
)

logger = logging.getLogger(__name__)
router = APIRouter()


# Schema Orientation:

## primary dataset: the dataset to be joined onto. falls back to "default."
#       This what the 'main logic' is done to in the SELECT clause of the SQL query.
####  secondary dataset: the dataset we're using to filter the primary dataset
###### join_key: the column to join on. see FilterSource in request_models.py
###### join_type: what type of join, either SQL standard (eg left) or spatial
###### columns: ORDERED {label, column} pairs.
#       The order is the filter cascade order; the label is what frontend shows;
#       the column is what is sent back to the sql


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
async def filter_tree_endpoint(source: str):
    colmap: dict = schema["default"][source]["columns"]
    return filter_tree(colmap, list(colmap.keys()), source)


@router.get("/load/mapping/zoning/filters")
async def zoning_filters():
    colmap = schema["default"]["zoning_info"]["columns"]
    print(colmap)
    return filter_tree(colmap, list(colmap.keys()), "zoning_info")


# TODO: wireup so this actually gets used.
@router.get("acs5-db/dp-combined/filters")
async def dp_combined_filters():
    return get_acs5_dp_combined_filters()
