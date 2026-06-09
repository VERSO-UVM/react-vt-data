"""
**Author**:
    Fitz Koch
**Created**:
    2026-06-02
**Description**:
    Shared functions for SQL scripts
"""

import logging

from query.processed_db import DB

logger = logging.getLogger(__name__)


def build_where_query_from_filters(filters: dict | None, colmap, table: str) -> str:
    """
    frontend-named filters -> parameterized WHERE clause
    Unknown keys ignored; colmap is source of truth.
    """
    clauses = []
    for label, values in (filters or {}).items():
        col = colmap[label]
        if col is None:
            logger.warning(f"{table}: ignoring unknown filter {label}")
            continue
        if not values:
            continue
        clauses.append(f'"{col}" IN ({", ".join(repr(v) for v in values)})')
    return ("WHERE " + " AND ".join(clauses)) if clauses else ""


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


def filter_tree(colmap: dict, tree_labels: list[str], table: str) -> dict:
    """
    Info for cascading filter UI.
    """
    cols = [colmap.get(label) for label in tree_labels]
    select = ", ".join(f'"{col}"' for col in cols)
    order = ", ".join(str(i + 1) for i in range(len(cols)))
    rows = DB.execute(
        f"SELECT DISTINCT {select} FROM {table} ORDER BY {order}"
    ).fetchall()
    return {"tree": _nest(rows), "labels": tree_labels}
