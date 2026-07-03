# Intentionally empty. Importing this package must stay side-effect free so that
# `query.sql_render` can be used by build scripts and tests before the processed
# DuckDB file exists (`query.processed_db` opens it at import time). Import
# submodules directly, e.g. `from query.zoning import get_zoning_geojson`.
