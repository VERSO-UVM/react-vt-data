from pydantic import BaseModel


class FilterRequest(BaseModel):
    filters: dict[str, list[str]] = {}
    format: str | None = "geojson"
    include: list[str] | None = []
    # ACS5 fields
    name: str | None = None
    year_min: int = 2010
    year_max: int = 2023
    categories: list[str] | None = None
    table: str = "DP05"
    measure: str | None = "Percent"
