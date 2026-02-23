"""
Author: Fitz Koch
Created: 2025-07-29
Description: centralized file for mapping functions.
NOTE: everything should be in espg=4326 when it gets here, as is set in data-loading.py
"""

import geopandas as gpd
import pandas as pd


def add_tooltip_from_dict(gdf, label_to_col, gdf_name=None):
    """
    Adds a tooltip column (for pydeck) using a dictionary with format {"label": "column_name"}.
    Optionally includes the gdf_name as the top line with a sepsarator.

    Note: this has been altered from the streamlit version to create tooltips that will work in
    html
    """

    def format_tooltip(row):
        tooltip_dict = {}
        if gdf_name:
            tooltip_dict["__title__"] = gdf_name
        for label, col in label_to_col.items():
            tooltip_dict[label] = row[col]
        return tooltip_dict

    gdf["tooltip"] = gdf.apply(format_tooltip, axis=1)
    return gdf


def add_cols_of_biggest_intersection(donor_gdf, altered_gdf, add_columns=None):
    """
    Take add_columns from the donor frame and add them to the altered frame.

    Adds 1 value per add_column per geometry in the altered_gdf.
    Gets those values from the geometry in the donor gdf with which the altered_gdf geometry
        has the **largest intersection**

    Returns the altered_gdf with new columns.
    """
    add_columns = add_columns or ["County", "District"]

    ## store original crs and set crs to a more easily calculable format
    og_crs = donor_gdf.crs
    donor_gdf = donor_gdf.copy().to_crs(epsg=3857)
    altered_gdf = altered_gdf.copy().to_crs(epsg=3857)

    ## save indices
    donor_gdf["donor_index"] = donor_gdf.index
    altered_gdf["alt_index"] = altered_gdf.index

    ## get largest intersections only (for each geometry in the alt_index)
    intersections = gpd.overlay(donor_gdf, altered_gdf, how="intersection")
    intersections["intersect_area"] = intersections.geometry.area
    largest = intersections.sort_values(
        "intersect_area", ascending=False
    ).drop_duplicates("alt_index", keep="first")

    ## merge relevant cols back into the og alt
    merge_cols = ["alt_index"] + add_columns
    final_df = pd.merge(
        left=altered_gdf, right=largest[merge_cols], on=["alt_index"], how="left"
    )

    ## reset crs to original and return
    final_df = final_df.to_crs(og_crs)
    return final_df
