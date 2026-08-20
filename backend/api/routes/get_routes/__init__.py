from .get_filters import get_filter_table_metadata
from .get_filters import router as filter_router
from .get_legend import router as legend_router

all_get_routers = [filter_router, legend_router]
