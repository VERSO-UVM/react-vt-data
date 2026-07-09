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


def run_wastewater_scrape(
    output_filename: str,
) -> None:
    """
    Fetch Wastewater data and save as parquet files.
    """
    wwtf, service_areas = fetch_wastewater()

    if wwtf is not None and service_areas is not None:
        wwtf.to_parquet(
            f"{STORAGE_LOCATION}/ww_treatment_facilities.parquet", index=False
        )
        service_areas.to_parquet(
            f"{STORAGE_LOCATION}/ww_service_areas.parquet", index=False
        )


if __name__ == "__main__":
    run_wastewater_scrape()
