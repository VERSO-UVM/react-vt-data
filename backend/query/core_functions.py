"""
**Author**:
    Fitz Koch
**Created**:
    2026-06-02
**Description**:
    Shared functions for SQL scripts
"""

import logging
from pathlib import Path

from api.models import FilterResponse, FilterSource, RangeDescriptor, RangeFilter
from query.processed_db import DB

logger = logging.getLogger(__name__)


def filter_clauses(filters: dict | None) -> list[str]:
    """Compile a {column: value} mapping into SQL boolean clauses.

    Filter values are either:
        a discrete list -> "IN"
        a RangeFilter -> ">= / <="
            NOTE: Range comparisons TRY_CAST the column to DOUBLE so they work on
            numeric columns and numbers stored as text (e.g. the ACS "year" column).
    """
    clauses: list[str] = []
    for col, values in (filters or {}).items():
        if values is None:
            continue

        if isinstance(values, RangeFilter):
            if values.min is not None:
                clauses.append(f'TRY_CAST("{col}" AS DOUBLE) >= {values.min}')
            if values.max is not None:
                clauses.append(f'TRY_CAST("{col}" AS DOUBLE) <= {values.max}')
            continue

        if not isinstance(values, (list, tuple, set)):
            values = [values]
        clauses.append(f'"{col}" IN ({", ".join(repr(v) for v in values)})')

    return clauses


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
        res = db.execute(f"""--sql
            SELECT MIN("{range_col}"), MAX("{range_col}") FROM {table}
        """).fetchone()
        if res and res[0] is not None:
            ranges.append(RangeDescriptor(label=range_label, col=range_col, bounds=res))
            return FilterResponse(tree=tree, labels=tree_labels, ranges=ranges)
    return FilterResponse(tree=tree, labels=tree_labels)


def compile_cte(filter_source: FilterSource) -> str:
    clauses = filter_clauses(filter_source.filters)
    where_string = ("WHERE " + " AND ".join(clauses)) if clauses else ""
    return f"""--sql
        SELECT DISTINCT {filter_source.join_key} FROM {filter_source.filter_table}
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

    # Direct single-table filtering: templates that use {where_string} (instead of
    # CTE/join) apply the first source's filters straight to the main query. {table}
    # resolves to that source so one template can serve multiple tables (e.g. ACS).
    where_string = ""
    table = ""
    if sources:
        clauses = filter_clauses(sources[0].filters)
        where_string = ("WHERE " + " AND ".join(clauses)) if clauses else ""
        table = sources[0].filter_table
        print("🟣 FILTER SOURCE:", sources)
        print("🟣 FILTERS:", sources[0].filters)
        print("🟣 WHERE STRING:", where_string)

    return sql_path.read_text().format(
        cte_filter_block=cte_filter_block,
        join_filter_block=join_filter_block,
        where_string=where_string,
        table=table,
    )
