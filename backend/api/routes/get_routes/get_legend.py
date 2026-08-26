import logging

from fastapi import APIRouter, Response

from query import (
    get_soil_suit_legend,
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/load/mapping/wastewater/septic_soil_legend")
async def wastewater_soil_suit_legend():
    data = get_soil_suit_legend()
    return Response(content=data, media_type="application/json")
