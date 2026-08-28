"""
**Author**:
    Ian Sargent
**Created**:
    2026-08-28
**Description**:
    Fetches Vermont building footprint data from the VCGI website
    Orginal Data Source: https://geodata.vermont.gov/datasets/VCGI::vt-building-footprints/about
"""

import os
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = Path(os.getenv("DATA_DIR", ROOT / "Data"))


# ---------------------------------------------------------------------------
# VCGI building footprint API fetch
# ---------------------------------------------------------------------------


# Fetch footprint data from local download (too big for API call)
def fetch_footprints() -> pd.DataFrame | None:
    df = pd.read_parquet(DATA_DIR / "footprints" / "building_footprints.parquet")
    return df


# ---------------------------------------------------------------------------
# Main scrape runner
# ---------------------------------------------------------------------------


def collect():
    df = fetch_footprints()
    return df


if __name__ == "__main__":
    df = collect()
