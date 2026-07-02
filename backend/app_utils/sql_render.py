"""
**Created**:
    2026-07-02
**Description**:
    Jinja SQL rendering plus the general-purpose filter compiler.

    SQL files under `query/sql/` and `build/sql/` are Jinja templates, so they can
    be linted with sqlfluff (`uv run sqlfluff lint query/sql build/sql` from
    `backend/`; lint-time template context lives in `backend/.sqlfluff`).

    Python compiles FilterSource objects into SQL fragments (filter CTEs, joins,
    and WHERE clauses) and injects them through the Jinja context. This keeps the
    filter mechanism general purpose: the same compiled filters can be joined onto
    any specialized query template.

    This module deliberately has no database dependency so both `query/` and
    `build/` (which runs before the processed DB exists) can import it.
"""

import logging
from pathlib import Path

from jinja2 import Environment, StrictUndefined

from api.models import FilterSource, RangeFilter

logger = logging.getLogger(__name__)

JINJA_ENV = Environment(undefined=StrictUndefined, keep_trailing_newline=True)


def render_sql(sql_path: Path, **context) -> str:
    """Render a Jinja SQL template file with the given context."""
    return JINJA_ENV.from_string(sql_path.read_text()).render(**context)


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


def compile_where(filters: dict | None) -> str:
    """Compile filters into a full WHERE clause ("" when there are no filters)."""
    clauses = filter_clauses(filters)
    return ("WHERE " + " AND ".join(clauses)) if clauses else ""


def compile_cte(filter_source: FilterSource) -> str:
    where_string = compile_where(filter_source.filters)
    return (
        f"SELECT DISTINCT {filter_source.join_key} "
        f"FROM {filter_source.filter_table} {where_string}"
    ).strip()


def compile_join(src: FilterSource, i: int) -> str:
    match src.join_type:
        case "inner":
            return f"JOIN f{i} USING ({src.join_key})"
        case "left":
            return f"LEFT JOIN f{i} USING ({src.join_key})"
        case "spatial_intersect":
            return f"JOIN f{i} ON ST_Intersects(g.geom, f{i}.geom)"
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

    # Direct single-table filtering: templates that use {{ where_string }} (instead
    # of CTE/join) apply the first source's filters straight to the main query.
    # {{ table }} resolves to that source so one template can serve multiple tables
    # (e.g. ACS).
    where_string = ""
    table = ""
    if sources:
        where_string = compile_where(sources[0].filters)
        table = sources[0].filter_table

    return render_sql(
        sql_path,
        cte_filter_block=cte_filter_block,
        join_filter_block=join_filter_block,
        where_string=where_string,
        table=table,
    )
