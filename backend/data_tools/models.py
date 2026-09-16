"""One tool contract shared by MCP and in-process agent callers."""

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

Text = Annotated[str, Field(min_length=1, max_length=500)]
Scalar = Annotated[str, Field(max_length=500)] | int | float | bool
FilterMap = Annotated[
    dict[Text, Annotated[list[Scalar], Field(min_length=1, max_length=50)]],
    Field(max_length=20),
]
GeoType = Literal["national", "state", "county", "county_subdivision", "tract"]


class Request(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)


class ListDatasets(Request):
    query: str = Field(default="", max_length=200)


class DatasetRequest(Request):
    dataset_id: Text


class DescribeDataset(DatasetRequest):
    value_column: Text | None = Field(
        default=None,
        description="An advertised filter column whose distinct values to discover.",
    )
    value_filters: FilterMap = Field(default_factory=dict)
    value_limit: int = Field(default=50, ge=1, le=100)


class SearchVariables(DatasetRequest):
    query: str = Field(default="", max_length=200)
    limit: int = Field(default=50, ge=1, le=100)


class SearchLocations(Request):
    query: str = Field(default="", max_length=200)
    geo_type: GeoType | None = None
    limit: int = Field(default=50, ge=1, le=100)


class QueryData(DatasetRequest):
    location_ids: list[Text] = Field(default_factory=list, max_length=50)
    geo_type: GeoType | None = None
    variable_ids: list[Annotated[str, Field(max_length=4096)]] = Field(
        default_factory=list, max_length=50
    )
    measures: list[Text] = Field(default_factory=list, max_length=20)
    columns: list[Text] | None = Field(
        default=None,
        min_length=1,
        max_length=64,
        description="Exact output fields, including optional _location_id and _units. Omit for all fields; use a narrow selection for wide zoning tables.",
    )
    include_row_units: bool = Field(
        default=True,
        description="Include per-row units in the default projection. Mixed-variable queries may have different units; explicit columns override the default projection.",
    )
    filters: FilterMap = Field(
        default_factory=dict,
        max_length=20,
        description="Exact matches on advertised fields. Text matches ignore case and surrounding whitespace. Unknown fields are errors.",
    )
    years: list[int] = Field(default_factory=list, max_length=100)
    year_min: int | None = Field(default=None, ge=1700, le=2200)
    year_max: int | None = Field(default=None, ge=1700, le=2200)
    limit: int = Field(default=100, ge=1, le=1000)
    cursor: str | None = Field(default=None, max_length=2048)

    @model_validator(mode="after")
    def valid_range(self):
        if (
            self.year_min is not None
            and self.year_max is not None
            and self.year_min > self.year_max
        ):
            raise ValueError("year_min must not exceed year_max")
        if self.years and (self.year_min is not None or self.year_max is not None):
            raise ValueError("Use years or a year range, not both")
        if any(year < 1700 or year > 2200 for year in self.years):
            raise ValueError("years must be between 1700 and 2200")
        if any(
            isinstance(v, str) and len(v) > 500
            for values in self.filters.values()
            for v in values
        ):
            raise ValueError("Filter values must be at most 500 characters")
        return self


class GetTimeseries(QueryData):
    """Retrieve temporal observations without interpolating missing years."""


class ComparePlaces(QueryData):
    location_ids: list[Text] = Field(min_length=2, max_length=20)
    year_policy: Literal["latest_common", "explicit"] = "latest_common"

    @model_validator(mode="after")
    def comparison_contract(self):
        if len(set(self.location_ids)) < 2:
            raise ValueError("Compare at least two distinct locations")
        if self.year_policy == "explicit" and len(self.years) != 1:
            raise ValueError("explicit comparisons require exactly one entry in years")
        if self.year_policy == "latest_common" and (
            self.years or self.year_min or self.year_max
        ):
            raise ValueError(
                "latest_common chooses the year; use explicit with years=[year]"
            )
        if not self.variable_ids:
            raise ValueError(
                "Choose variable_ids using search_variables before comparing places"
            )
        return self


class GetZoningSummary(Request):
    municipality: Text | None = None
    location_id: Text | None = Field(
        default=None,
        description="Canonical county-subdivision ID from search_locations; unambiguous alternative to municipality.",
    )
    county: Text | None = None
    include_overlays: bool = False
    limit: int = Field(default=100, ge=1, le=1000)
    cursor: str | None = Field(default=None, max_length=2048)

    @model_validator(mode="after")
    def one_location_selector(self):
        if self.municipality and self.location_id:
            raise ValueError("Use municipality or location_id, not both")
        return self


class ExportData(QueryData):
    """Export one bounded CSV page with the same query and provenance contract."""


TOOL_MODELS = {
    "list_datasets": ListDatasets,
    "describe_dataset": DescribeDataset,
    "search_variables": SearchVariables,
    "search_locations": SearchLocations,
    "query_data": QueryData,
    "get_timeseries": GetTimeseries,
    "compare_places": ComparePlaces,
    "get_zoning_summary": GetZoningSummary,
    "export_data": ExportData,
}

TOOL_DESCRIPTIONS = {
    "list_datasets": "Discover available Vermont datasets, sources, actual year coverage and unavailable tables. Start here.",
    "describe_dataset": "Inspect fields, units, provenance, and actual year coverage including gaps. Discover distinct filter values with value_column, optional value_filters, and value_limit.",
    "search_variables": "Find variable IDs using words across selector fields, with each variant's actual year coverage. IDs select exact source labels; differently labelled historical variants have separate IDs.",
    "search_locations": "Resolve a place name to canonical geography IDs. Returns distinct town/city/county candidates; never guesses an ambiguous place.",
    "query_data": "Read a bounded page using validated filters, variables, locations and years. Select columns for compact output; text filters ignore case and surrounding whitespace. Empty results include hints. Follow next_cursor with identical arguments.",
    "get_timeseries": "Read year-ordered source observations over a year range; preserves gaps, units and provenance. Does not interpolate, aggregate medians, or inflation-adjust dollars.",
    "compare_places": "Compare selected variables for two or more places at one geography level and a common year (latest_common or explicit). Returns source observations without averaging places or mixing years.",
    "get_zoning_summary": "Summarize district counts and recorded acres using a municipality name or canonical location_id. Ambiguous city/town names require clarification. Reports excluded overlays and source geography defects; acreage is a sum, not dissolved land area.",
    "export_data": "Export a bounded CSV page inline with source provenance and a continuation cursor. Save csv locally and follow next_cursor for more. Spreadsheet formula cells are escaped; full geometries are excluded.",
}
