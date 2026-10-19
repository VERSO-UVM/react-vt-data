"""
**Author**:
    Ian Sargent
**Created**:
    2026-08-28
**Description**:
    Fetches Vermont building footprint data from
    local parquet file (downloaded from VCGI)
    Orginal Data Source: https://geodata.vermont.gov/datasets/VCGI::vt-building-footprints/about
"""

import os
from pathlib import Path

import geopandas as gpd

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = Path(os.getenv("DATA_DIR", ROOT / "Data"))


# ---------------------------------------------------------------------------
# VCGI building footprint fetch
# ---------------------------------------------------------------------------


# Read footprint data from local download (too big for API call).
# Read as GeoParquet so the file's CRS is kept and lake_build can reproject it.
def fetch_footprints() -> gpd.GeoDataFrame:
    df = gpd.read_parquet(DATA_DIR / "footprints" / "building_footprints.parquet")
    return df


# ---------------------------------------------------------------------------
# Main scrape runner
# ---------------------------------------------------------------------------


def collect():
    df = fetch_footprints()
    return df


if __name__ == "__main__":
    df = collect()
