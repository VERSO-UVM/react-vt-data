from .get_filters import router as filter_router
from .get_wholedata import router as whole_router
from .get_db import router as demo_db_router

all_get_routers = [filter_router, whole_router, demo_db_router]
