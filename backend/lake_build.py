import os
from pathlib import Path
from typing import Iterable, Union

import duckdb
import geopandas as gpd
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent

DATA_DIR = Path(os.getenv("DATA_DIR", ROOT / "Data"))
LAKE_PATH = DATA_DIR / "lake"
STORAGE_PATH = DATA_DIR / "lake.files"


def get_connection() -> duckdb.DuckDBPyConnection:
    """
    Create a connection to the DuckLake.
    """
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    STORAGE_PATH.mkdir(parents=True, exist_ok=True)

    con = duckdb.connect()

    for extension in ["ducklake", "spatial"]:
        try:
            con.execute(f"LOAD {extension}")
        except duckdb.Error:
            con.execute(f"INSTALL {extension}")
            con.execute(f"LOAD {extension}")

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

    con.execute("CREATE SCHEMA IF NOT EXISTS lake.RAW")
    con.execute("CREATE SCHEMA IF NOT EXISTS lake.CLEANED")

    return con


def insert_year(
    name: str,
    df: pd.DataFrame,
    years: Union[int, Iterable[int]],
    con: duckdb.DuckDBPyConnection | None = None,
):
    """
    Insert or replace data for specific year(s) in a DuckLake table.
    """
    if "year" not in map(str.lower, df.columns):
        raise ValueError(f"DataFrame for {name!r} does not contain a 'year' column.")

    if isinstance(years, int):
        years_list = [years]
    else:
        years_list = list(years)

    if isinstance(df, gpd.GeoDataFrame):
        df = df.copy()
        df["geometry"] = df.geometry.to_wkb()

    # If no lake connection, create one
    own_connection = con is None
    if own_connection:
        con = get_connection()

    con.register("tmp_df", df)

    try:
        schema, table = name.split(".", 1) if "." in name else ("RAW", name)

        table_exists = (
            con.execute(
                """--sql
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
            con.execute(f"CREATE TABLE lake.{schema}.{table} AS SELECT * FROM tmp_df")
            return

        # Transaction prevents half-deleted/half-inserted errors
        con.execute("BEGIN TRANSACTION")

        con.execute(
            f"""--sql
            DELETE FROM lake.{schema}.{table}
            WHERE year IN ({",".join("?" for _ in years_list)})
            """,
            years_list,
        )

        con.execute(
            f"""--sql
            INSERT INTO lake.{schema}.{table}
            BY NAME
            SELECT * FROM tmp_df
            """
        )

        con.execute("COMMIT")

    except Exception:
        con.execute("ROLLBACK")
        raise
    finally:
        con.unregister("tmp_df")
        if own_connection:
            con.close()


def replace_table(
    name: str,
    df: pd.DataFrame,
    con: duckdb.DuckDBPyConnection | None = None,
):
    """
    Replace an entire table in the DuckLake with the updated new one.
    """
    if isinstance(df, gpd.GeoDataFrame):
        df = df.copy()
        df["geometry"] = df.geometry.to_wkb()

    own_connection = con is None
    if own_connection:
        con = get_connection()

    # Parse schema correctly to avoid quoting bugs
    schema, table = name.split(".", 1) if "." in name else ("RAW", name)
    con.register("tmp_df", df)

    try:
        con.execute(
            f"""--sql
            CREATE OR REPLACE TABLE lake.{schema}.{table}
            AS SELECT * FROM tmp_df
            """
        )
    finally:
        con.unregister("tmp_df")
        if own_connection:
            con.close()
