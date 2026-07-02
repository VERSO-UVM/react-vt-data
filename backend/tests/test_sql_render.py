"""
Tests for app_utils/sql_render.py:
  filter_clauses / compile_where / compile_filters (the general-purpose filter
  compiler), render_sql / sql_filter_block (Jinja rendering), and sqlfluff checks
  that every SQL template lints clean and renders to parseable DuckDB SQL with
  representative filters applied.
"""

from pathlib import Path

import pytest
from sqlfluff.core import FluffConfig, Linter

from api.models import FilterSource, RangeFilter
from app_utils.sql_render import (
    compile_filters,
    compile_where,
    filter_clauses,
    render_sql,
    sql_filter_block,
)

BACKEND = Path(__file__).resolve().parent.parent
QUERY_SQL = BACKEND / "query" / "sql"
BUILD_SQL = BACKEND / "build" / "sql"

# ---------------------------------------------------------------------------
# Representative render arguments per template
# ---------------------------------------------------------------------------

WHERE_SOURCE = FilterSource(
    filter_table="acs5_b10_census",
    filters={
        "NAME": ["Vergennes", "Addison town"],
        "year": RangeFilter(min=2015, max=2020),
    },
)
CTE_SOURCE = FilterSource(
    filter_table="zoning_info",
    filters={"County": ["Addison"]},
    join_key="OBJECT_ID",
    join_type="inner",
)

# template path (relative to backend/) -> FilterSource list for sql_filter_block
QUERY_TEMPLATE_SOURCES = {
    "query/sql/acs5/acs5_tidy.sql": [WHERE_SOURCE],
    "query/sql/acs5/median_earnings.sql": [WHERE_SOURCE],
    "query/sql/acs5/snapshot.sql": [WHERE_SOURCE],
    "query/sql/acs5/unemployment_rate.sql": [WHERE_SOURCE],
    "query/sql/cdc/places.sql": [
        FilterSource(
            filter_table="cdc_places",
            filters={"Measure": ["Depression among adults"]},
        )
    ],
    "query/sql/zoning/agg_info_table.sql": [CTE_SOURCE],
    "query/sql/zoning/info_table.sql": [CTE_SOURCE],
    "query/sql/zoning/geo_query.sql": [CTE_SOURCE],
    "query/sql/zoning/rules.sql": [CTE_SOURCE],
}

# build templates take plain string context instead of FilterSources
BUILD_TEMPLATE_CONTEXT = {
    "build/sql/zoning_colors.sql": {},
    "build/sql/zoning_info.sql": {"info_string": "OBJECT_ID, County"},
    "build/sql/zoning_rules.sql": {
        "rule_string": 'CAST("Residential_Min_Lot" AS VARCHAR) AS residential_min_lot'
    },
}


# ---------------------------------------------------------------------------
# Filter compiler
# ---------------------------------------------------------------------------


class TestFilterClauses:
    def test_in_list(self):
        assert filter_clauses({"County": ["Addison", "Rutland"]}) == [
            "\"County\" IN ('Addison', 'Rutland')"
        ]

    def test_scalar_becomes_in_list(self):
        assert filter_clauses({"County": "Addison"}) == ["\"County\" IN ('Addison')"]

    def test_range(self):
        clauses = filter_clauses({"year": RangeFilter(min=2015, max=2020)})
        assert clauses == [
            'TRY_CAST("year" AS DOUBLE) >= 2015.0',
            'TRY_CAST("year" AS DOUBLE) <= 2020.0',
        ]

    def test_none_values_skipped(self):
        assert filter_clauses({"County": None}) == []
        assert filter_clauses(None) == []

    def test_compile_where(self):
        assert compile_where(None) == ""
        where = compile_where({"a": ["x"], "b": ["y"]})
        assert where == "WHERE \"a\" IN ('x') AND \"b\" IN ('y')"


class TestCompileFilters:
    def test_empty_sources(self):
        assert compile_filters([]) == ("", "")

    def test_inner_join(self):
        cte, join = compile_filters([CTE_SOURCE])
        assert cte.startswith("WITH f0 AS (SELECT DISTINCT OBJECT_ID")
        assert join == "JOIN f0 USING (OBJECT_ID)"

    def test_left_join(self):
        src = CTE_SOURCE.model_copy(update={"join_type": "left"})
        _, join = compile_filters([src])
        assert join == "LEFT JOIN f0 USING (OBJECT_ID)"

    def test_spatial_join(self):
        src = FilterSource(
            filter_table="zoning_geom", join_key="geom", join_type="spatial_intersect"
        )
        _, join = compile_filters([src])
        assert join == "JOIN f0 ON ST_Intersects(g.geom, f0.geom)"


# ---------------------------------------------------------------------------
# Jinja rendering
# ---------------------------------------------------------------------------


class TestRendering:
    def test_where_string_injected(self):
        sql = sql_filter_block(BACKEND / "query/sql/acs5/acs5_tidy.sql", [WHERE_SOURCE])
        assert "FROM acs5_b10_census" in sql
        assert "WHERE \"NAME\" IN ('Vergennes', 'Addison town')" in sql
        assert "{{" not in sql and "{%" not in sql

    def test_cte_and_join_injected(self):
        sql = sql_filter_block(BACKEND / "query/sql/zoning/geo_query.sql", [CTE_SOURCE])
        assert sql.startswith("WITH f0 AS (")
        assert "JOIN f0 USING (OBJECT_ID)" in sql

    def test_no_sources_renders_unfiltered(self):
        sql = sql_filter_block(BACKEND / "query/sql/zoning/info_table.sql", [])
        assert "WHERE" not in sql

    def test_undefined_variable_raises(self):
        from jinja2 import UndefinedError

        with pytest.raises(UndefinedError):
            render_sql(BACKEND / "build/sql/zoning_info.sql")


# ---------------------------------------------------------------------------
# sqlfluff: templates lint clean, rendered SQL parses as DuckDB
# ---------------------------------------------------------------------------


def test_all_templates_accounted_for():
    """Every .sql file has a representative context in this test module."""
    templates = {
        str(p.relative_to(BACKEND))
        for d in (QUERY_SQL, BUILD_SQL)
        for p in d.rglob("*.sql")
    }
    assert templates == set(QUERY_TEMPLATE_SOURCES) | set(BUILD_TEMPLATE_CONTEXT)


def test_templates_pass_sqlfluff():
    """Same check as `sqlfluff lint query/sql build/sql` (config in .sqlfluff)."""
    linter = Linter(config=FluffConfig.from_path(str(BACKEND)))
    result = linter.lint_paths((str(QUERY_SQL), str(BUILD_SQL)))
    violations = result.get_violations()
    assert violations == [], [str(v) for v in violations]


@pytest.mark.parametrize("template", sorted(QUERY_TEMPLATE_SOURCES))
def test_rendered_query_sql_parses(template):
    sql = sql_filter_block(BACKEND / template, QUERY_TEMPLATE_SOURCES[template])
    _assert_parses(sql, template)


@pytest.mark.parametrize("template", sorted(BUILD_TEMPLATE_CONTEXT))
def test_rendered_build_sql_parses(template):
    sql = render_sql(BACKEND / template, **BUILD_TEMPLATE_CONTEXT[template])
    _assert_parses(sql, template)


def _assert_parses(sql: str, template: str):
    linter = Linter(
        config=FluffConfig(overrides={"dialect": "duckdb", "templater": "raw"})
    )
    parsed = linter.parse_string(sql)
    assert parsed.violations == [], (template, sql, [str(v) for v in parsed.violations])
