"""
**Author**:
    Fitz Koch
**Created**:
    2026-06-10
**Description**:
    Core functions used across different API routes.
"""

from api.config import schema
from api.models import FilterRequest, FilterSource, FilterSpec
from api.routes import get_filter_table_metadata


def spec_to_source(spec: FilterSpec, target_table: str) -> FilterSource:
    src_schema = get_filter_table_metadata(target_table, spec.filter_table)
    colmap = {**src_schema["columns"], **src_schema.get("range", {})}
    mapped_filters = {}
    dropped = {}

    for k, v in spec.filters.items():
        if k in colmap:
            mapped_filters[colmap[k]] = v
        else:
            dropped[k] = v

    return FilterSource(
        filter_table=spec.filter_table,
        filters=mapped_filters,
        join_key=src_schema["join_key"],
        join_type=src_schema["join_type"],
    )


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
    # Discrete columns and range columns are both addressed by label; merge them
    # so a request can carry e.g. {"County": [...], "Percent": {min, max}}.
    colmap = {**src_schema["columns"], **src_schema.get("range", {})}
    return FilterSource(
        filter_table=sec_table,
        filters={colmap[k]: v for k, v in request.filters.items() if k in colmap},
        join_key=src_schema["join_key"],
        join_type=src_schema["join_type"],
    )
