"""
Open Research Community Accelorator
Vermont Data App

Wastewater Utility Functions
"""

from app_utils.data_cleaning import convert_all_timestamps_to_str
from app_utils.mapping import add_tooltip_from_dict

SOIL_COLOR = {
    "Well Suited": [44, 160, 44, 180],
    "Moderately Suited": [255, 204, 0, 180],
    "Marginally Suited": [253, 126, 20, 180],
    "Not Suited": [220, 53, 69, 180],
    "Not Rated": [108, 117, 125, 180],
}


### cleaning and mapping functions  ##
def add_soil_tooltip(gdf):
    return add_tooltip_from_dict(
        gdf,
        gdf_name="Wastewater",
        label_to_col={
            "Suitability": "Suitability",
            "Acreage": "Acres_fmt",
            "Municipality": "Jurisdiction",
        },
    )


def define_soil_colors(gdf):
    gdf["rgba_color"] = gdf["Suitability"].apply(lambda x: SOIL_COLOR.get(x))
    return gdf


def clean_soil_frame(gdf):
    gdf["polygon_coords"] = gdf.geometry.apply(extract_2d_coords)
    gdf["Acres_fmt"] = gdf["Acres"].map(lambda x: f"{x:,.0f}")
    gdf = gdf[
        [
            "Suitability",
            "Jurisdiction",
            "Acres_fmt",
            "geometry",
            "rgba_color",
            "Acres",
            "polygon_coords",
        ]
    ].copy()
    return gdf


def extract_2d_coords(g):
    return [[[x, y] for x, y in g.exterior.coords]]


def process_soil_data(gdf):
    """
    Wrapper for multiple functions to clean and add colors to a soil frame
    """
    gdf = define_soil_colors(gdf)
    gdf = clean_soil_frame(gdf)
    gdf = add_soil_tooltip(gdf)
    gdf = convert_all_timestamps_to_str(gdf)
    return gdf
