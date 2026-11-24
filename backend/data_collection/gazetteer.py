"""
**Author**:
    marobinette
**Created**:
    2026-11-23
**Description**:
    Fetches county land area from the Census Gazetteer counties file, used to
    compute population density on the Statewide County Comparison page.
    One pinned vintage serves every ACS year: Vermont county lines haven't
    changed, so land area is constant.
    Columns: USPS | GEOID | ANSICODE | NAME | ALAND | AWATER | ALAND_SQMI |
             AWATER_SQMI | INTPTLAT | INTPTLONG (one row per US county, PR included)
"""

from io import BytesIO

import pandas as pd
import requests

GAZETTEER_YEAR = 2024

URL = (
    "https://www2.census.gov/geo/docs/maps-data/data/gazetteer/"
    f"{GAZETTEER_YEAR}_Gazetteer/{GAZETTEER_YEAR}_Gaz_counties_national.zip"
)


# ---------------------------------------------------------------------------
# Fetching
# ---------------------------------------------------------------------------


def fetch_gazetteer() -> pd.DataFrame:
    """Download the zip and read the one tab-separated .txt inside it."""
    r = requests.get(URL, timeout=30)
    r.raise_for_status()
    df = pd.read_csv(
        BytesIO(r.content),
        compression="zip",  # pandas opens the single file inside the zip
        sep="\t",
        # IDs stay text so leading zeros survive (Alabama is "01001", not 1001)
        dtype={"GEOID": str, "ANSICODE": str},
    )
    # The last header ("INTPTLONG") has trailing spaces in the raw file
    df.columns = df.columns.str.strip()
    return df


# ---------------------------------------------------------------------------
# Main scrape runner
# ---------------------------------------------------------------------------


def collect() -> pd.DataFrame:
    """All US counties, unfiltered; the cleaner picks out VT and the US total."""
    return fetch_gazetteer()


if __name__ == "__main__":
    df = collect()
