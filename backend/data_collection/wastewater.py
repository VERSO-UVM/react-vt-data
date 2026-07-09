from io import BytesIO

import pandas as pd
import requests
from pyogrio import read_dataframe

WWTF_URL = "https://raw.githubusercontent.com/VERSO-UVM/Wastewater-Infrastructure-Mapping/refs/heads/main/data/Vermont_Treatment_Facilities.geojson"
SERVICE_AREA_URL = "https://raw.githubusercontent.com/VERSO-UVM/Wastewater-Infrastructure-Mapping/main/data/Vermont_Service_Areas.geojson"
STORAGE_LOCATION = "Data/wastewater"

# ---------------------------------------------------------------------------
# Wastewater API fetch
# ---------------------------------------------------------------------------


# Fetch wastewater data from github repo (geojson files)
def fetch_WWTF() -> pd.DataFrame | None:
    r = requests.get(WWTF_URL, timeout=30)
    r.raise_for_status()
    df = read_dataframe(BytesIO(r.content))
    return df


def fetch_service_areas() -> pd.DataFrame | None:
    r = requests.get(SERVICE_AREA_URL, timeout=30)
    r.raise_for_status()
    df = read_dataframe(BytesIO(r.content))
    return df


def fetch_wastewater():
    wwtf = fetch_WWTF()
    service_areas = fetch_service_areas()

    return wwtf, service_areas


# ---------------------------------------------------------------------------
# Main scrape runner
# ---------------------------------------------------------------------------


def collect():
    wwtf, service_areas = fetch_wastewater()

    return {
        "ww_treatment_facilities": wwtf,
        "ww_service_areas": service_areas,
    }


def main():
    collect()


if __name__ == "__main__":
    main()
