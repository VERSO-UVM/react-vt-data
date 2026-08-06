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

BASE_URL = (
    "https://anrmaps.vermont.gov/arcgis/rest/services/Open_Data/OPENDATA_ANR_EMERGENCY_SP_NOCACHE_v2/MapServer/57/query?outFields=*&where=1%3D1&f=geojson"
)
STORAGE_LOCATION = "Data/flood"

# ---------------------------------------------------------------------------
# FEMA Flood API fetch
# ---------------------------------------------------------------------------

# Fetch zoning data from github repo (an fgb file)


def fetch_flood() -> pd.DataFrame | None:
    r = requests.get(BASE_URL, timeout=30)
    r.raise_for_status()
    df = read_dataframe(BytesIO(r.content))
    return df


# ---------------------------------------------------------------------------
# Main scrape runner
# ---------------------------------------------------------------------------


def collect():
    df = fetch_flood()
    return df


if __name__ == "__main__":
    df = collect()
