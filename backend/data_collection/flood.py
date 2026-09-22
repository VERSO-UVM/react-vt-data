"""
**Author**:
    Ian Sargent
**Created**:
    2026-07-13
**Description**:
    Fetches Vermont FEMA flood data from the VT ANR ArcGIS RestAPI
    Orginal Data Source: https://geodata.vermont.gov/datasets/VTANR::flood-hazard-areas-only-fema-digitized-data/explore?location=43.838610%2C-72.732276%2C7
"""

from io import BytesIO

import pandas as pd
import requests
from pyogrio import read_dataframe

# ---------------------------------------------------------------------------
# FEMA Flood API fetch
# ---------------------------------------------------------------------------


# Fetch flood data from VCGI API (this uses pagination to get around the row limit)
def fetch_flood() -> pd.DataFrame | None:
    start_rows = list(range(0, 8000, 1000))
    dfs = []
    for row_num in start_rows:
        BASE_URL = f"https://anrmaps.vermont.gov/arcgis/rest/services/Open_Data/OPENDATA_ANR_EMERGENCY_SP_NOCACHE_v2/MapServer/57/query?outFields=*&where=1%3D1&resultRecordCount=2000&resultOffset={row_num}&f=geojson"
        r = requests.get(BASE_URL, timeout=3000)
        r.raise_for_status()
        df = read_dataframe(BytesIO(r.content))
        dfs.append(df)

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
