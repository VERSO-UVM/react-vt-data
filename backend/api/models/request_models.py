from typing import Literal

from pydantic import BaseModel, model_validator


class FilterRequest(BaseModel):
    filters: dict[str, list[str]] = {}
    format: str | None = "geojson"
    include: list[str] | None = []
    # ACS5 fields
    name: str | None = None
    year_min: int = 2010
    year_max: int = 2023


class DPSeriesRequest(BaseModel):
    name: str
    table: str
    category: str
    subcategory: str
    variable: str
    measure: str
    year_min: int = 2009
    year_max: int = 2024


join_types = Literal["inner", "left", "spatial_intersect"]


class FilterSource(BaseModel):
    """
    New class for Filter Request Model.
        source: the table to source from
        filters: dictionary list of filters to apply (on that table)
        join_key: the column to join on -- NONE if spatial join
        join_type: what type of join to apply.

    Generally, it's on you to make sure that the table has the join key.

    NOTE: if join_type=spatial in any way, then:
        1) the SELECT clause in the main SQL must have a g.geom column exposed
        2) the join_key must be geom, which must be in the table.

    Args:
        BaseModel (_type_): _description_
    """

    source: str
    filters: dict[str, list[str]] = {}
    join_key: str = "OBJECT_ID"
    join_type: join_types = "inner"

    @model_validator(mode="after")
    def check_join_key(self) -> "FilterSource":
        if "spatial" in self.join_type and self.join_key != "geom":
            raise ValueError("join_key=geom required for spatial joins")
        return self
