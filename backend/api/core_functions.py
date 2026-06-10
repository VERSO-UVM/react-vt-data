"""
**Author**:
    Fitz Koch
**Created**:
    2026-06-10
**Description**:
    Core functions used across different API routes.
"""

from api.models import FilterRequest, FilterSource
from api.config import schema


def request_to_source(
    request: FilterRequest, sec_table: str, primary_table: str = "default"
) -> FilterSource:
    """A shim to turn a filter request and table information into a filter source

    Args:
        request (FilterRequest): _description_
        sec_table (str): the name of the table the filter applies to.
        primary_table (str): default to 'default'. The first key of schema.
            the name of the table you are using the sec_table TO filter.

    Returns:
        FilterSource: _description_
    """
    src_schema = schema[primary_table][sec_table]
    colmap = src_schema["columns"]
    return FilterSource(
        source=sec_table,
        filters={colmap[k]: v for k, v in request.filters.items() if k in colmap},
        join_key=src_schema["join_key"],
        join_type=src_schema["join_type"],
    )
