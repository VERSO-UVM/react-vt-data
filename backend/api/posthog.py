"""FastAPI dependencies for accessing the process-wide PostHog client."""

from typing import Annotated

from fastapi import Depends, Request
from posthog import Posthog


def get_posthog_client(request: Request) -> Posthog | None:
    """Return the client initialized during the application lifespan."""
    return getattr(request.app.state, "posthog_client", None)


PosthogClient = Annotated[Posthog | None, Depends(get_posthog_client)]
