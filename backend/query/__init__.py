"""
Query layer. Public names are resolved lazily so that importing a light
submodule (e.g. `query.sql_render` from the ETL cleaning scripts) does not
open the production warehouse, which doesn't exist until after cleaning.
"""

from importlib import import_module

_EXPORTS = {
    "query.ambulance": [
        "get_ambulance_export_table",
        "get_ambulance_geojson",
        "get_ambulance_legend",
    ],
    "query.cdc": [
        "dual_var_comparison",
        "get_cdc_county_pca",
        "get_cdc_export_table",
        "get_cdc_places_tidy",
        "single_var_geojson",
    ],
    "query.comparison": ["compare_variables", "composite_index", "dataset_registry"],
    "query.core_functions": ["filter_options", "filter_ranges", "filter_tree"],
    "query.flood": ["get_flood_geojson"],
    "query.production_db": ["get_db"],
    "query.wastewater": [
        "get_soil_suit_geojson",
        "get_soil_suit_legend",
        "get_waste_service_areas_geojson",
        "get_waste_treatment_facility_geojson",
        "get_waste_treatment_facility_permits",
        "get_wastewater_export_table",
    ],
    "query.zoning": ["get_zoning_aggregated_acres", "get_zoning_geojson"],
}
_NAME_TO_MODULE = {n: m for m, names in _EXPORTS.items() for n in names}

__all__ = sorted(_NAME_TO_MODULE)


def __getattr__(name: str):
    module = _NAME_TO_MODULE.get(name)
    if module is None:
        raise AttributeError(f"module 'query' has no attribute {name!r}")
    return getattr(import_module(module), name)
