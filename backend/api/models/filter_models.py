from pydantic import BaseModel


class FilterRequest(BaseModel):
    filters: dict[str, list[str]] = {}  ## geography filters
    format: str | None = "geojson"  ## return format
    include: (
        list[str] | None
    ) = []  ## list of keys to include. Can be metrics, dfs within a list, etc
