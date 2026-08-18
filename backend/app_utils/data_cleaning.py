"""
Open Research Community Accelorator
Vermont Data App

File Handling Utility Functions
"""

import pandas as pd


def strip_all_whitespace(df):
    df = df.copy()
    # Strip column names
    df.columns = df.columns.str.strip()

    # Drop duplicate column names, keeping the first
    df = df.loc[:, ~df.columns.duplicated()]

    # Strip whitespace from all string cells
    for col in df.select_dtypes(include="object"):
        df[col] = df[col].str.strip()

    return df


def convert_all_timestamps_to_str(gdf):
    """
    Converts all timestamp columns in a GeoDataFrame
    into strings for mapping purposes.

    @param gdf: A pandas DataFrame or GeoDataFrame object.
    @return: The DataFrame.
    """
    # Convert all datetime columns to strings
    for col, dtype in gdf.dtypes.items():
        if "datetime" in str(dtype):
            gdf[col] = gdf[col].astype(str)

    # Return the GeoDataFrame
    return gdf
