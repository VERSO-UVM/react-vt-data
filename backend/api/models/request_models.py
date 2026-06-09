from pydantic import BaseModel


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
