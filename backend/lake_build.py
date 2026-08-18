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
    f"""--sql
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
con.execute("""CREATE SCHEMA IF NOT EXISTS lake.RAW""")
con.execute("""CREATE SCHEMA IF NOT EXISTS lake.CLEANED""")


def insert_year(name: str, df: pd.DataFrame, year: int):
    """
    Insert or replace one year's data in a DuckLake table.
    """

    if "year" not in map(str.lower, df.columns):
        raise ValueError(f"DataFrame for {name!r} does not contain a 'year' column.")

    if isinstance(df, gpd.GeoDataFrame):
        df = df.copy()
        df["geometry"] = df.geometry.to_wkb()

    con.register("tmp_df", df)

    try:
        schema, table = name.split(".", 1) if "." in name else ("RAW", name)

        table_exists = (
            con.execute(
                """
            SELECT COUNT(*)
            FROM information_schema.tables
            WHERE table_catalog = 'lake'
              AND table_schema = ?
              AND table_name = ?
            """,
                [schema, table],
            ).fetchone()[0]
            > 0
        )

        if not table_exists:
            con.execute(
                f"""
                CREATE TABLE lake.{schema}.{table}
                AS SELECT * FROM tmp_df
                """
            )
            return

        # Remove this year's existing data.
        con.execute(
            f"""
            DELETE FROM lake.{schema}.{table}
            WHERE year = ?
            """,
            [year],
        )

        # Insert the replacement.
        con.execute(
            f"""
            INSERT INTO lake.{schema}.{table}
            SELECT * FROM tmp_df
            """
        )

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
