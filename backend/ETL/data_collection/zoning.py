from io import BytesIO

import pandas as pd
import requests
from pyogrio import read_dataframe

BASE_URL = "https://raw.githubusercontent.com/VERSO-UVM/Vermont-Zoning-Atlas/main/data/vt-zoning-update.fgb"
STORAGE_LOCATION = "Data/zoning"

# ---------------------------------------------------------------------------
# Zoning API fetch
# ---------------------------------------------------------------------------

# Fetch zoning data from github repo (an fgb file)


def fetch_zoning() -> pd.DataFrame | None:
    r = requests.get(BASE_URL, timeout=30)
    r.raise_for_status()
    df = read_dataframe(BytesIO(r.content))
    return df


# ---------------------------------------------------------------------------
# Main scrape runner
# ---------------------------------------------------------------------------


def collect():
    df = fetch_zoning()
    return df


if __name__ == "__main__":
    df = collect()
