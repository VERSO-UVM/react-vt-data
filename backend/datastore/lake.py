from pathlib import Path

import duckdb
import geopandas as gpd
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent  # backend/
DATA_DIR = ROOT / "Data"
LAKE_PATH = DATA_DIR / "lake"

DATA_DIR.mkdir(exist_ok=True)

con = duckdb.connect()

# Load extension
try:
    con.execute("LOAD ducklake")
except duckdb.Error:
    con.execute("INSTALL ducklake")
    con.execute("LOAD ducklake")

# Attach the DuckLake catalog
con.execute(f"""
    ATTACH '{LAKE_PATH.as_posix()}'
    AS lake
    (TYPE ducklake)
""")

# Create schemas in the lake catalog
con.execute("CREATE SCHEMA IF NOT EXISTS lake.RAW")
con.execute("CREATE SCHEMA IF NOT EXISTS lake.CLEANED")


def replace_table(name: str, df: pd.DataFrame):
    """
    Replace or create a table in the DuckLake catalog.

    Args:
        name : str
            Name of the destination table.
        df : pd.DataFrame
            DataFrame to write.
    """
    if isinstance(df, gpd.GeoDataFrame):
        df = df.copy()
        # Convert geometry objects to WKB bytes
        df["geometry"] = df.geometry.to_wkb()

    con.register("tmp_df", df)

    con.execute(f"""
        CREATE OR REPLACE TABLE lake.{name}
        AS
        SELECT *
        FROM tmp_df
    """)

    con.unregister("tmp_df")
