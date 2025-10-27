from pydantic import BaseModel


class FilterRequest(BaseModel):
    filters: dict[str, list[str]] = {}
    format: str | None = "geojson"