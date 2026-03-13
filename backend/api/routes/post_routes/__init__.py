from .post_acs5_db import router as post_acs5_router
from .post_census import router as post_census_router
from .post_export import router as post_export_router
from .post_qcew import router as post_qcew_router
from .post_zoning import router as post_zoning_router

all_post_routers = [
    post_zoning_router,
    post_census_router,
    post_acs5_router,
    post_qcew_router,
    post_export_router,
]
