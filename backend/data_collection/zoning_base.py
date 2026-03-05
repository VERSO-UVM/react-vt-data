"""
Zoning data preparation script.

Reads, cleans, and processes the raw FlatGeobuf using existing app_utils
functions, then writes the result to Data/zoning/vt_zoning_processed.parquet
with geometry stored as WKB for DuckDB spatial compatibility.

Run from the backend/ directory:
    conda run -n leahy_data python data_collection/zoning_base.py
"""

from pathlib import Path

import pandas as pd

from app_utils.data_loading import load_zoning_data
from app_utils.zoning import process_zoning_data

OUT_PATH = Path(__file__).resolve().parent.parent / "Data" / \
    "zoning" / "vt_zoning.parquet"


def run_fetch() -> None:
    print("Loading and processing zoning data...")

    gdf = process_zoning_data(load_zoning_data())

    # Serialise geometry to WKB for parquet / DuckDB compatibility
    df = pd.DataFrame(gdf)
    df["geometry"] = gdf["geometry"].apply(
        lambda geom: geom.wkb if geom is not None else None
    )

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    df.to_parquet(OUT_PATH, index=False)

    print(f"\nDone. {len(df):,} rows -> {OUT_PATH}")


if __name__ == "__main__":
    run_fetch()
