from .post_census import router as post_census_router
from .post_zoning import router as post_zoning_router

all_post_routers = [post_zoning_router, post_census_router]