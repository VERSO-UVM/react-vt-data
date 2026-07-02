import geopandas as gpd
import pandas as pd
from pydantic import BaseModel

from logger.logging import setup_api_logger

logger = setup_api_logger()


class APIResponse(BaseModel):
    """API Response for actual data. Note that:
            data is required
            tableData should only be included if tableData must be differentiated from regular data (eg, for a table view)
            metadata should always be included

    Args:
        BaseModel (_type_): _description_
    """

    data: dict | list = {}
    tableData: dict | list | None = None  # unaggregated for table view
    metadata: dict | None = (
        None  # TODO include this throughout API, then make no longer optional.
    )


class RangeDescriptor(BaseModel):
    """range_label -- optional, what to call the terminal range
        range_col -- optional, what the terminal range is in the backend
        bounds -- the bounds of the terminal column. Calculated overall, not as leaves of tree.

    Args:
        BaseModel (_type_): _description_
    """

    label: str
    col: str
    bounds: tuple[float, float]


class FilterResponse(BaseModel):
    """Response to a request for the information to build front end filters.
        tree -- the hierarchical tree of possible (cascading) values
        labels -- what to call the columns we'll filter on
        ranges -- a list of ranges (see RangeDescriptor). For now, this list has a length of zero or one.


    Args:
        BaseModel (_type_): _description_
    """

    tree: dict
    labels: list[str]
    ranges: list[RangeDescriptor] = []


def make_response(
    data: pd.DataFrame | gpd.GeoDataFrame | dict | list,
    metadata: dict,
    tableData: pd.DataFrame | gpd.GeoDataFrame | dict | list | None = None,
) -> APIResponse:
    data = serialize_data(data)
    tableData = serialize_data(tableData) if tableData is not None else None
    return APIResponse(data=data, tableData=tableData, metadata=metadata)


def serialize_data(data):
    if isinstance(data, gpd.GeoDataFrame):
        df = pd.DataFrame(data.drop(columns="geometry"))
        return df.to_dict(orient="records")

    elif isinstance(data, pd.DataFrame):
        data = data.to_dict(orient="records")

    logger.debug(f"serialized type: {type(data)}")
    return data
