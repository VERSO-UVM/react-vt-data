from .get_filters import router as filter_router
from .get_wholedata import router as whole_router

all_get_routers = [filter_router, whole_router]
