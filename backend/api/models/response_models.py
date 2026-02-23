import geopandas as gpd
import pandas as pd
from pydantic import BaseModel

from logger.logging import setup_api_logger

logger = setup_api_logger()


class APIResponse(BaseModel):
    """API Response. Note that:
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



def make_response(
    data: pd.DataFrame | gpd.GeoDataFrame | dict | list,
    metadata: dict,
    tableData: pd.DataFrame | gpd.GeoDataFrame | dict | list | None = None,
) -> APIResponse:
    data = serialize_data(data)
    tableData = serialize_data(tableData) if tableData is not None else None
    return APIResponse(data=data, tableData=tableData, metadata=metadata)


def serialize_data(
    data: pd.DataFrame | gpd.GeoDataFrame | dict | list,
) -> dict | list:
    if isinstance(data, gpd.GeoDataFrame):
        df = pd.DataFrame(data.drop(columns="geometry"))
        return df.to_dict(orient="records")
    elif isinstance(data, pd.DataFrame):
        data = data.to_dict(orient="records")
    logger.debug(f"serialized type: {type(data)}")
    logger.debug(
        f"serialized sample: {data[:2] if isinstance(data, list) else 'not a list'}"
    )
    return data
