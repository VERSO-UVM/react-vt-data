"""
Open Research Community Accelorator
Vermont Data App

File Handling Utility Functions
"""

import os

import geopandas as gpd
import pandas as pd

from app_utils.data_cleaning import clean_data
from app_utils.geospatial import get_lat_lon_cols, is_latitude_longitude


def read_data(file):
    """
    Read the uploaded file and return a DataFrame or GeoDataFrame.

    @param file: An UploadedFile or file path.
    @return: The read data file as a pandas DataFrame or geopandas GeoDataFrame object.
    """
    file_extension = get_file_extension(file)

    if file_extension == ".csv":
        return pd.read_csv(file)
    elif file_extension == ".sav":
        import tempfile

        import pyreadstat as prs

        with tempfile.NamedTemporaryFile(delete=False, suffix=".sav") as tmp:
            tmp.write(file.read())
            tmp_path = tmp.name

        df, _ = prs.read_sav(tmp_path)
        return df
    elif file_extension == ".xlsx":
        return pd.read_excel(file, engine="openpyxl")
    elif file_extension == ".xls":
        return pd.read_excel(file, engine="xlrd")
    elif file_extension in [".geojson", ".json", ".fgb", ".shp"]:
        return gpd.read_file(file, engine="pyogrio")
    else:
        raise ValueError(
            f"Unsupported file format '{file_extension}'. "
            "Please upload a CSV, JSON, GEOJSON, SAV, XLS, or XLSX file."
        )


def process_uploaded_files(user_files):
    """
    Process the uploaded files and return a list of (DataFrame, filename) tuples.
    """
    seen_hashes = set()
    processed = []

    if not user_files:
        return []

    for file in user_files:
        fid = file_hash(file)
        if fid in seen_hashes:
            continue
        seen_hashes.add(fid)

        try:
            df = read_data(file)
        except ValueError:
            continue
        if df is None:
            continue

        df = clean_data(df)

        if is_latitude_longitude(df):
            try:
                lat_col, lon_col = get_lat_lon_cols(df)
                df = gpd.GeoDataFrame(
                    df,
                    geometry=gpd.points_from_xy(df[lon_col], df[lat_col]),
                    crs="EPSG:4326",
                )
            except Exception:
                continue

        filename = get_file_name(file)
        processed.append((df, filename))

    return processed


def file_hash(file):
    """
    Generates a SHA-256 hash for either a file object or a local file path (str).
    """
    import hashlib

    hasher = hashlib.sha256()

    if isinstance(file, str):
        with open(file, "rb") as f:
            content = f.read()
            hasher.update(content)
    else:
        file.seek(0)
        content = file.read()
        hasher.update(content)
        file.seek(0)

    return hasher.hexdigest()


def get_file_name(file):
    """
    Extracts the name of the file.
    """
    if isinstance(file, str):
        return os.path.basename(file)
    elif hasattr(file, "name"):
        return file.name
    else:
        return "unknown"


def get_file_extension(file):
    """
    Extracts the extension of a file.
    """
    if isinstance(file, str):
        return os.path.splitext(file)[1].lower()
    elif hasattr(file, "name"):
        return os.path.splitext(file.name)[1].lower()
    else:
        return ""
