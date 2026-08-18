"""
Author: Fitz Koch
Created: 2025-07-29
Description: layer for all the non-streamlit logic for the flooding page
"""

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
