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
from api.models import FilterSource
from pathlib import Path

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


def filter_tree(colmap: dict, tree_labels: list[str], table: str, db=DB) -> dict:
    """
    Info for cascading filter UI.
    TODO: Right now, we pass in separate db.
    When we consolidate all SQL to one source/place, we'll update this to be just one.
    """
    cols = [colmap.get(label) for label in tree_labels]
    select = ", ".join(f'"{col}"' for col in cols)
    order = ", ".join(str(i + 1) for i in range(len(cols)))
    rows = db.execute(
        f"SELECT DISTINCT {select} FROM {table} ORDER BY {order}"
    ).fetchall()
    return {"tree": _nest(rows), "labels": tree_labels}


def compile_cte(filter_source: FilterSource) -> str:
    clauses = []
    for col, values in (filter_source.filters or {}).items():
        clauses.append(f'"{col}" IN ({", ".join(repr(v) for v in values)})')
    where_string = ("WHERE " + " AND ".join(clauses)) if clauses else ""
    return f"""--sql
        SELECT DISTINCT {filter_source.join_key} FROM {filter_source.source}
        {where_string}
    """


def compile_join(src: FilterSource, i) -> str:
    match src.join_type:
        case "inner":
            return f"""--sql
                JOIN f{i} USING ({src.join_key})
                """
        case "left":
            return f"""--sql
                LEFT JOIN f{i} USING ({src.join_key})
                """
        case "spatial_intersect":
            return f"""--sql
                JOIN f{i} ON ST_Intersects(g.geom, f{i}.geom)
                """
        case _:
            raise ValueError("No logic for that join type")


def compile_filters(sources: list[FilterSource]) -> tuple[str, str]:
    ctes, joins = [], []
    for i, src in enumerate(sources):
        ctes.append(f"f{i} AS ({compile_cte(src)})")
        joins.append(compile_join(src, i))
    cte_block = ("WITH " + ",\n".join(ctes)) if ctes else ""
    join_block = "\n".join(joins)
    return cte_block, join_block


def sql_filter_block(sql_path: Path, sources: list[FilterSource]) -> str:
    cte_filter_block, join_filter_block = compile_filters(sources)
    return sql_path.read_text().format(
        cte_filter_block=cte_filter_block, join_filter_block=join_filter_block
    )
