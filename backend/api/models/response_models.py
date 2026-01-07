import pandas as pd
from pydantic import BaseModel


class APIResponse(BaseModel):
    """API Response. Note that:
            data is required
            table_data should only be included if table_data must be differentiated from regular data (eg, for a table view)
            metadata should always be included

    Args:
        BaseModel (_type_): _description_
    """

    data: dict | list = {}
    table_data: dict | list | None = None  # unaggregated for table view
    metadata: dict | None = (
        None  # TODO include this throughout API, then make no longer optional.
    )


def make_response(
    data: pd.DataFrame | dict | list,
    metadata: dict,
    table_data: pd.DataFrame | dict | list | None = None,
) -> APIResponse:
    """_summary_

    Args:
        data (pd.DataFrame | dict | list): data, required.
        metadata (dict): metatdata, required
        table_data (pd.DataFrame | dict | list | None, optional): table_data is optional, and should only be included if the data (for viz) is distinct from what a table (raw) data would use

    Returns:
        APIResponse: _description_
    """
    if isinstance(data, pd.DataFrame):
        data = data.to_dict(orient="records")
    if isinstance(table_data, pd.DataFrame):
        table_data = table_data.to_dict(orient="records")

    return APIResponse(data=data, table_data=table_data, metadata=metadata)
