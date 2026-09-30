from fastapi import APIRouter, Response

from api.core_functions import spec_to_source
from api.models import FilterSpec
from api.posthog import PosthogClient
from query.parcels import get_parcels_geojson

router = APIRouter()


@router.post("/load/mapping/parcels/standard")
async def parcels_geojson(
    specs: list[FilterSpec],
    posthog_client: PosthogClient,
):
    sources = [spec_to_source(spec, "default") for spec in specs]
    data = get_parcels_geojson(sources)
    if posthog_client:
        posthog_client.capture(
            "parcel_map_requested",
            properties={"$process_person_profile": False},
        )
    return Response(content=data, media_type="application/json")
