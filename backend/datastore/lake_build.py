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
    con.execute(
        """--sql
        LOAD ducklake
        """
    )
except duckdb.Error:
    con.execute(
        """--sql
        INSTALL ducklake
        """
    )
    con.execute(
        """--sql
        LOAD ducklake
        """
    )

# Attach the DuckLake catalog
con.execute(
    f"""--sql
    ATTACH '{LAKE_PATH.as_posix()}'
    AS lake
    (TYPE ducklake)
"""
)

# Create schemas in the lake catalog
con.execute(
    """--sql
    CREATE SCHEMA IF NOT EXISTS lake.RAW
    """
)
con.execute(
    """--sql
    CREATE SCHEMA IF NOT EXISTS lake.CLEANED
    """
)


def insert_year(name: str, df: pd.DataFrame, year: int):
    """
    Insert a year's data into a DuckLake table.

    - If the table does not exist, it's created.

    - If the table already exists and contains the specified year,
      rows are deleted and replaced with the new data.

    - If the table exists but does not contain the specified year,
      the new rows are appended.
    """

    if "year" not in list(map(str.lower, df.columns)):
        raise ValueError(
            f"Cannot upsert by year: DataFrame for {name!r} "
            "does not contain a 'year' column."
        )

    if isinstance(df, gpd.GeoDataFrame):
        df = df.copy()
        df["geometry"] = df.geometry.to_wkb()

    con.register("tmp_df", df)

    try:
        # Check whether the destination table already exists.
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
            con.execute(
                f"""--sql 
                CREATE TABLE lake.{name} AS 
                SELECT * FROM tmp_df 
                """
            )
            return

        # Remove the existing version of this year.
        con.execute(
            f"""--sql
            DELETE FROM lake.{name} 
            WHERE year = ? 
            """,
            [year],
        )
        # Insert the newly collected data.
        con.execute(
            f"""--sql
            INSERT INTO lake.{name} 
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
