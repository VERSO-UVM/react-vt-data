"""
**Author**:
    Ian Sargent
**Created**:
    2026-07-13
**Updated**:
    2026-10-05
**Description**:
    Fetches Vermont flood hazard zones from the FEMA National Flood Hazard
    Layer (NFHL) ArcGIS REST API (layer 28, Flood Hazard Zones).
    Data Source: https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28
"""

from io import BytesIO

import pandas as pd
import requests
from pyogrio import read_dataframe
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# ---------------------------------------------------------------------------
# FEMA Flood API fetch
# ---------------------------------------------------------------------------


# Fetch Vermont flood zones from FEMA NFHL (using pagination)
URL = "https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28/query"
PARAMS = {
    "where": "DFIRM_ID LIKE '50%'",  # Filtering to Vermont flood zones
    "outFields": "*",
    "resultRecordCount": 500,
    "f": "geojson",
}


def fetch_flood() -> pd.DataFrame | None:
    page_size = PARAMS["resultRecordCount"]  # 500
    session = requests.Session()
    session.mount(
        "https://",
        HTTPAdapter(
            max_retries=Retry(
                total=6, backoff_factor=2, status_forcelist=[500, 502, 503, 504]
            )
        ),
    )
    dfs = []
    offset = 0
    while True:
        r = session.get(URL, params={**PARAMS, "resultOffset": offset}, timeout=300)
        r.raise_for_status()
        df = read_dataframe(BytesIO(r.content))
        dfs.append(df)
        if len(df) < page_size:
            break
        offset += page_size

    df = pd.concat(dfs, ignore_index=True)

    return df


# ---------------------------------------------------------------------------
# Main scrape runner
# ---------------------------------------------------------------------------


def collect():
    df = fetch_flood()
    return df


if __name__ == "__main__":
    df = collect()
