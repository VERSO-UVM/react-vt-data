from fastapi import APIRouter
from app_utils import data_loading
from app_utils.df_filtering import FilterState
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/load/mapping/zoning/filters")
async def read_zoning_data():
    data = data_loading.masterload(name="zoning")
    filter_columns = ["County", "Jurisdiction", "District Name"]
    logger.info(f"cols are {filter_columns}")
    Filter = FilterState(data, filter_columns=filter_columns)
    return {"tree": Filter.tree, "labels": filter_columns}
