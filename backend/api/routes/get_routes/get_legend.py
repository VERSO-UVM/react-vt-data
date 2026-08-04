import json
import logging

from fastapi import APIRouter, Response

from app_utils import data_loading
from app_utils.flooding import add_flood_color

logger = logging.getLogger(__name__)

from query import (
    get_soil_suit_legend,
)


router = APIRouter()


@router.get("/load/mapping/wastewater/septic_soil_legend")
async def wastewater_soil_suit_legend():
    data = get_soil_suit_legend()
    # return (json.loads(data))
    return Response(content=data, media_type="application/json")
