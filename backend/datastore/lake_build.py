import os
from pathlib import Path

import duckdb
import geopandas as gpd
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent

DATA_DIR = Path(os.getenv("DATA_DIR", ROOT / "Data"))
LAKE_PATH = DATA_DIR / "lake"
STORAGE_PATH = DATA_DIR / "lake.files"

DATA_DIR.mkdir(parents=True, exist_ok=True)
STORAGE_PATH.mkdir(parents=True, exist_ok=True)

con = duckdb.connect()

# Load extension
try:
    con.execute("LOAD ducklake")
except duckdb.Error:
    con.execute("INSTALL ducklake")
    con.execute("LOAD ducklake")

# Attach DuckLake catalog
con.execute(
    f"""
    ATTACH '{LAKE_PATH.as_posix()}'
    AS lake
    (
        TYPE ducklake,
        DATA_PATH '{STORAGE_PATH.as_posix()}',
        OVERRIDE_DATA_PATH TRUE
    )
    """
)

# Create schemas in the lake catalog
con.execute("""--sql CREATE SCHEMA IF NOT EXISTS lake.RAW""")
con.execute("""--sql CREATE SCHEMA IF NOT EXISTS lake.CLEANED""")


def insert_year(name: str, df: pd.DataFrame, year: int):
    """
    Insert a year's data into a DuckLake table.

    - If the table does not exist, it's created.

    - If the table already exists and contains the specified year,
      rows are deleted and replaced with the new data.

    - If the table exists but does not contain the specified year,
      the new rows are appended.
    """

    # For static datasets
    if "year" not in list(map(str.lower, df.columns)):
        raise ValueError(
            f"Cannot insert that year: DataFrame for {name!r} "
            "does not contain a 'year' column."
        )

    if isinstance(df, gpd.GeoDataFrame):
        df = df.copy()
        df["geometry"] = df.geometry.to_wkb()

    # Temporary table for changing
    con.register("tmp_df", df)

    try:
        # Check whether the table already exists.
        table_exists = (
            con.execute(
                """--sql
            SELECT COUNT(*) 
            FROM information_schema.tables 
            WHERE table_schema = 'lake' 
            AND table_name = ? 
            """,
                [name],
            ).fetchone()[0]
            > 0
        )

        if not table_exists:
            try:
                con.execute(
                    f"""--sql
                    CREATE TABLE IF NOT EXISTS lake.{name} AS
                    SELECT * FROM tmp_df WHERE 1=0
                    """
                )
                con.execute(f"INSERT INTO lake.{name} SELECT * FROM tmp_df")
            except duckdb.CatalogException:
                pass
            else:
                return

        # Insert the newly collected data.
        con.execute(
            f"""--sql
            INSERT INTO lake.{name} 
            SELECT * FROM tmp_df 
            """
        )

    except Exception as e:
        print(f"Failed to write {name}: {e}")
        raise

    finally:
        con.unregister("tmp_df")


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

    con.execute(
        f"""--sql
        CREATE OR REPLACE TABLE lake.{name}
        AS
        SELECT *
        FROM tmp_df
    """
    )

    con.unregister("tmp_df")
