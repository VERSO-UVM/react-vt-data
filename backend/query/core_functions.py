"""
**Author**:
    Fitz Koch
**Created**:
    2026-06-02
**Description**:
    Shared DB-backed helpers for the query layer (filter option/tree discovery).

    The general-purpose filter compiler and Jinja SQL renderer live in
    `query/sql_render.py`, which has no DB dependency.
"""

import logging

from api.models import FilterResponse, RangeDescriptor
from query.processed_db import DB

logger = logging.getLogger(__name__)


def _nest(rows: list[tuple]) -> dict:
    """
    Fold sorted distinct rows into a nested dict; leaves are None.
    """
    tree: dict = {}
    for row in rows:
        node = tree
        for val in row[:-1]:
            node = node.setdefault(val, {})
        node.setdefault(row[-1], None)
    return tree


def filter_options(
    colmap: dict, labels: list[str], table: str, db=DB
) -> FilterResponse:
    options = {}
    for label in labels:
        col = colmap[label]
        rows = db.execute(f'SELECT DISTINCT "{col}" FROM {table} ORDER BY 1').fetchall()
        options[label] = [r[0] for r in rows if r[0] is not None]
    return FilterResponse(labels=labels, options=options)


def filter_tree(
    colmap: dict, tree_labels: list[str], table: str, db=DB, rangemap: dict = {}
) -> FilterResponse:
    """
    Info for cascading filter UI.
    TODO: Right now, we pass in separate db.
    When we consolidate all SQL to one source/place, we'll update this to be just one.
    TODO: update to not pass in tree_labels but just use from schema
    """
    cols = [colmap.get(label) for label in tree_labels]
    select = ", ".join(f'"{col}"' for col in cols)
    order = ", ".join(str(i + 1) for i in range(len(cols)))
    rows = db.execute(
        f"SELECT DISTINCT {select} FROM {table} ORDER BY {order}"
    ).fetchall()
    tree = _nest(rows)
    if rangemap:
        ranges = []
        range_label, range_col = next(iter(rangemap.items()))
        res = db.execute(
            f'SELECT MIN("{range_col}"), MAX("{range_col}") FROM {table}'
        ).fetchone()
        if res and res[0] is not None:
            ranges.append(RangeDescriptor(label=range_label, col=range_col, bounds=res))
            return FilterResponse(tree=tree, labels=tree_labels, ranges=ranges)
    return FilterResponse(tree=tree, labels=tree_labels)
