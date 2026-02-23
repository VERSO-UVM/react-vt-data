"""
Open Research Community Accelorator
Vermont Data App

Zoning Utility Functions
"""

import pandas as pd

from app_utils.color import add_fill_colors
from app_utils.mapping import add_tooltip_from_dict


def process_zoning_data(gdf):
    """
    wrapper for all the cleaning, color, tooltip functions for zoning dataset
    """
    gdf = clean_zoning_gdf(gdf)
    gdf = add_fill_colors(gdf, column="District Type", cmap="tab20")
    gdf = add_zoning_tooltip(gdf)
    return gdf


def clean_zoning_gdf(gdf):
    """
    Function to format columns for tooltip display and prune unneeded columns
    """

    ## replace names
    gdf["District Type"] = gdf["District Type"].replace(
        {
            "Primarily Residential": "Residential",
            "Mixed with Residential": "Mixed",
            "Nonresidential": "Nonresidential",
            "Overlay not Affecting Use": "Overlay",
        }
    )

    ## format the acres string
    gdf["Acres_fmt"] = gdf["Acres"].map(lambda x: f"{x:,.0f}")

    return gdf


def add_zoning_tooltip(gdf):
    return add_tooltip_from_dict(
        gdf,
        gdf_name="Zoning",
        label_to_col={
            "District": "Jurisdiction District Name",
            "Type": "District Type",
            "Acreage": "Acres_fmt",
        },
    )


def compute_acerage_metrics(gdf):
    df = gdf.drop(columns=["geometry"])
    metrics = {
        "total_acreage": df["Acres"].sum(),
        "num_districts": len(df),
        "num_residential_districts": len(df[df["District Type"] == "Residential"]),
        "residential_acreage": df[df["District Type"] == "Residential"]["Acres"].sum(),
    }
    return metrics
