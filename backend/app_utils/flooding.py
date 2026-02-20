"""
Author: Fitz Koch
Created: 2025-07-29
Description: layer for all the non-streamlit logic for the flooding page
"""

from app_utils.mapping import add_tooltip_from_dict, map_gdf_single_layer


def explode_flood_polygons(gdf):
    def get_coordinates(geom):
        if geom.geom_type == "Polygon":
            return [list(geom.exterior.coords)]
        elif geom.geom_type == "MultiPolygon":
            return [list(poly.exterior.coords) for poly in geom.geoms]
        return []

    # Define a new "coordinates" column derived from geometry
    gdf["coordinates"] = gdf["geometry"].apply(get_coordinates)

    gdf.explode(index_parts=False)
    gdf.explode("coordinates", ignore_index=True)
    return gdf


# Orange → red gradient by FEMA zone type (all are SFHA high-risk).
# AE is by far the most common (~80 % of polygons); A is secondary.
# Higher opacity and warmer/darker hues increase map legibility.
_FLOOD_ZONE_COLORS: dict[str, list[int]] = {
    "A": [255, 140, 0, 195],  # amber — high-risk, no BFE
    "AE": [230, 60, 0, 205],  # orange-red — high-risk with BFE (most common)
    "AH": [200, 20, 0, 195],  # dark red — shallow ponding
    "AO": [255, 110, 0, 195],  # orange — shallow sheet flow
}
_FLOOD_DEFAULT_COLOR: list[int] = [220, 50, 0, 185]


def add_flood_color(gdf):
    gdf = gdf.copy()
    gdf["rgba_color"] = gdf["FLD_ZONE"].map(
        lambda z: _FLOOD_ZONE_COLORS.get(z, _FLOOD_DEFAULT_COLOR)
    )
    return gdf


def clean_flood_gdf(gdf):
    """
    Function to format columns for tooltip display and prune unneeded columns
    """
    gdf = gdf[gdf["SFHA_TF"] == "T"]
    gdf["ZONE_SUBTY_DISPLAY"] = gdf["ZONE_SUBTY"].fillna("None")
    gdf["STATIC_BFE_DISPLAY"] = gdf["STATIC_BFE"].where(
        gdf["STATIC_BFE"] != -9999, "N/A"
    )
    gdf = gdf[
        [
            "SFHA_TF",
            "FLD_ZONE",
            "ZONE_SUBTY_DISPLAY",
            "STATIC_BFE_DISPLAY",
            "geometry",
            "rgba_color",
        ]
    ].copy()
    return gdf


def add_flood_tooltip(gdf):
    return add_tooltip_from_dict(
        gdf,
        gdf_name="Flooding",
        label_to_col={"Zone": "FLD_ZONE", "Additional Info": "ZONE_SUBTY_DISPLAY"},
    )


def plot_flood_gdf(gdf):
    return map_gdf_single_layer(gdf)


def process_flood_gdf(gdf):
    """ "
    Wrapper for adding colors, cleaning, and tooltipping logic, etc.
    """
    gdf = add_flood_color(gdf)
    gdf = clean_flood_gdf(gdf)
    gdf = add_flood_tooltip(gdf)
    gdf = explode_flood_polygons(gdf)
    return gdf
