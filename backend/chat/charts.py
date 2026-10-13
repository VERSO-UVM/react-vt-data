"""Chart specs that reference data by tool call instead of carrying rows.

The agent emits a spec whose ``data`` is a read-only data tool call. The browser
resolves that reference through ``/api/chat/data``, so the model never restates
a table and nothing is stored between turns.
"""

from __future__ import annotations

from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field, WithJsonSchema, model_validator

from data_tools.models import TOOL_MODELS, GeoType
from data_tools.service import DataToolService

# Tools whose results are row tables a chart can draw.
CHARTABLE_TOOLS = (
    "query_data",
    "get_timeseries",
    "compare_places",
    "get_zoning_summary",
)
# The resolver owns paging; a reference never pins a page.
PAGING_FIELDS = ("limit", "cursor")


FILTERS_HINT = 'Exact matches as lists, e.g. {"Variable": ["Renters"], "quarter": [4]}.'


def normalize_filters(args: dict[str, Any]) -> dict[str, Any]:
    """Wrap single filter values in lists ({"quarter": 4} -> {"quarter": [4]}).

    Free-form objects reach many models with no field list, so they often send
    one value where the data tools expect a list.
    """
    filters = args.get("filters")
    if not isinstance(filters, dict):
        return args
    return {
        **args,
        "filters": {k: v if isinstance(v, list) else [v] for k, v in filters.items()},
    }


class RefArgs(BaseModel):
    """Every argument the chartable tools accept, for the schema models see.

    A bare dict schema reaches OpenAI-style models as an object with no
    properties, and some (GPT-6.1 Sol through OpenRouter) then always send
    `{}`. Listing the fields fixes that; DataRef still validates the args
    against the specific tool's own model.
    """

    model_config = ConfigDict(extra="forbid")

    dataset_id: str | None = None
    location_ids: list[str] | None = None
    geo_type: GeoType | None = None
    variable_ids: list[str] | None = None
    measures: list[str] | None = None
    columns: list[str] | None = None
    include_row_units: bool | None = None
    filters: dict[str, list[str | int | float | bool]] | None = Field(
        default=None,
        description=FILTERS_HINT,
    )
    years: list[int] | None = None
    year_min: int | None = None
    year_max: int | None = None
    year_policy: Literal["latest_common", "explicit"] | None = None
    municipality: str | None = Field(default=None, description="Zoning only.")
    location_id: str | None = Field(default=None, description="Zoning only.")
    county: str | None = Field(default=None, description="Zoning only.")
    include_overlays: bool | None = Field(default=None, description="Zoning only.")


REF_ARGS_SCHEMA = {
    **RefArgs.model_json_schema(),
    "description": (
        "The same arguments you passed to the data tool (omit any you didn't "
        "use, and leave out limit and cursor)."
    ),
}


class DataRef(BaseModel):
    model_config = ConfigDict(extra="forbid")

    tool: Literal[
        "query_data", "get_timeseries", "compare_places", "get_zoning_summary"
    ]
    # Validated and stored as a plain dict; only the schema shown to models
    # lists the fields (see RefArgs).
    args: Annotated[dict[str, Any], WithJsonSchema(REF_ARGS_SCHEMA)]
    # Optional ranking applied after every page is fetched, so "top 10 towns"
    # needs one reference instead of the model paging through every row.
    sort_by: str | None = Field(
        default=None,
        max_length=200,
        description="Column to sort all rows by; rows with no value go last.",
    )
    descending: bool = Field(default=True, description="Largest values first.")
    top: int | None = Field(
        default=None,
        ge=1,
        le=100,
        description="Keep only the first N rows after sorting.",
    )

    @model_validator(mode="after")
    def valid_tool_args(self):
        # Models filling every field send nulls for the ones they didn't use.
        self.args = normalize_filters(
            {
                k: v
                for k, v in self.args.items()
                if k not in PAGING_FIELDS and v is not None
            }
        )
        TOOL_MODELS[self.tool].model_validate(self.args)
        return self


ChartKind = Literal["line", "bar", "stacked_bar", "area", "table"]
# Columns that are plumbing, not something a reader wants in a table.
HIDDEN_COLUMNS = {"_location_id", "_units", "_unit_issue", "geoid", "county_fips"}


class ChartSpec(BaseModel):
    model_config = ConfigDict(extra="forbid")

    kind: ChartKind = Field(
        description=(
            "line: values over years. bar: compare places or categories "
            "(named categories draw as horizontal bars). stacked_bar: parts of "
            "a whole per category, split by series. area: parts of a whole "
            "over years, split by series. table: rows too many or too varied "
            "to chart; set columns."
        )
    )
    title: str = Field(min_length=1, max_length=200)
    data: DataRef
    x: str | None = Field(
        default=None,
        max_length=200,
        description="Column for the x axis (required except for tables).",
    )
    y: str | None = Field(
        default=None,
        max_length=200,
        description="Numeric column for the y axis (required except for tables).",
    )
    series: str | None = Field(
        default=None,
        max_length=200,
        description="Optional column that splits rows into one line, bar group, or stack layer per value, e.g. the place name.",
    )
    columns: list[str] | None = Field(
        default=None,
        max_length=12,
        description="Table only: columns to show, in order. Defaults to the readable columns.",
    )
    y_label: str | None = Field(default=None, max_length=100)
    note: str | None = Field(
        default=None,
        max_length=500,
        description="Short caveat shown under the chart (source gaps, units).",
    )

    @model_validator(mode="after")
    def encoding_for_kind(self):
        if self.kind != "table" and not (self.x and self.y):
            raise ValueError(f"A {self.kind} chart needs x and y columns")
        if self.kind in ("stacked_bar", "area") and not self.series:
            raise ValueError(f"A {self.kind} chart needs a series column to stack")
        return self


def resolve_rows(
    service: DataToolService, ref: DataRef, max_rows: int
) -> dict[str, Any]:
    """Run a data reference, following pages until exhausted or ``max_rows``."""
    args = {**ref.args, "limit": service.max_rows}
    first = service.call(ref.tool, args)
    rows = list(first.get("rows", []))
    cursor = first.get("next_cursor")
    while cursor and len(rows) < max_rows:
        page = service.call(ref.tool, {**args, "cursor": cursor})
        rows.extend(page.get("rows", []))
        cursor = page.get("next_cursor")
    truncated = bool(cursor) or len(rows) > max_rows
    rows = rows[:max_rows]
    columns = first.get("columns", [])
    if ref.sort_by:
        if ref.sort_by not in columns:
            raise ValueError(
                f"Can't sort by {ref.sort_by}; columns are: {', '.join(columns)}"
            )
        if truncated:
            # A ranking of a partial result would be wrong, not just short.
            raise ValueError(
                f"More than {max_rows} rows to rank; narrow the filters (one year, one geography level)"
            )
        present, missing = [], []
        for row in rows:
            value = row.get(ref.sort_by)
            (present if isinstance(value, (int, float)) else missing).append(row)
        present.sort(key=lambda r: r[ref.sort_by], reverse=ref.descending)
        rows = present + missing
    if ref.top:
        rows = rows[: ref.top]
    return {
        "columns": columns,
        "units": first.get("units"),
        "provenance": first.get("provenance"),
        "warehouse_version": first.get("warehouse_version"),
        "rows": rows,
        "truncated": truncated and not ref.top,
    }


def check_columns(spec: ChartSpec, columns: list[str]) -> list[str]:
    """Return the spec's fields that the referenced result lacks."""
    wanted = [spec.x, spec.y, spec.series, *(spec.columns or [])]
    return [field for field in wanted if field and field not in columns]


def overlapping_rows(spec: ChartSpec, rows: list[dict[str, Any]]) -> list[str] | None:
    """Columns that tell apart rows sharing one chart point, or None if none do.

    A chart point is an (x, series) pair. Several rows on one point would be
    drawn as one value and silently hide the rest (issue #106), so the agent
    must filter them down or split them with series.
    """
    if spec.kind == "table":
        return None
    seen: dict[tuple, dict[str, Any]] = {}
    varying: set[str] = set()
    for row in rows:
        key = (row.get(spec.x), row.get(spec.series) if spec.series else None)
        other = seen.setdefault(key, row)
        if other is not row:
            varying |= {
                c
                for c in row
                if c not in HIDDEN_COLUMNS
                and c != spec.y
                and not isinstance(row.get(c), (dict, list))
                and row.get(c) != other.get(c)
            }
    if not varying and len(seen) == len(rows):
        return None
    return sorted(varying)
