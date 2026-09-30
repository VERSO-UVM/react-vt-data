from fastapi import APIRouter, Response

from api.core_functions import request_to_source
from api.models import FilterRequest
from api.posthog import PosthogClient
from query import get_flood_geojson

router = APIRouter()


@router.post("/load/mapping/flood_legal")
async def flood_geojson(
    request: FilterRequest,
    posthog_client: PosthogClient,
):
    source = request_to_source(request, "FEMA_floodHazard_geom", "default")
    data = get_flood_geojson([source])
    if posthog_client:
        posthog_client.capture(
            "flood_map_requested",
            properties={"$process_person_profile": False},
        )
    return Response(content=data, media_type="application/json")
