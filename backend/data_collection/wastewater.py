"""
**Author**:
    Ian Sargent
**Created**:
    2026-07-13
**Description**:
    Fetches Vermont wastewater data files from the WIM GitHub repository

    Learn more about the data here:
        https://verso-uvm.github.io/Wastewater-Infrastructure-Mapping/data.html
"""

import pandas as pd
from pyogrio import read_dataframe

WWTF_URL = "https://raw.githubusercontent.com/VERSO-UVM/Wastewater-Infrastructure-Mapping/refs/heads/main/data/Vermont_Treatment_Facilities.geojson"
SERVICE_AREA_URL = "https://raw.githubusercontent.com/VERSO-UVM/Wastewater-Infrastructure-Mapping/main/data/Vermont_Service_Areas.geojson"
SOIL_SUITABILITY_URL = "https://raw.githubusercontent.com/VERSO-UVM/Vermont-Livability-Map/main/data/{rpc}_Soil_Septic.fgb"
WATER_FEATURES_URL = "https://raw.githubusercontent.com/VERSO-UVM/Wastewater-Infrastructure-Mapping/main/data/Vermont_Water_Features.geojson"

RPCs = [
    "ACRPC",
    "BCRC",
    "CCRPC",
    "CVRPC",
    "LCPC",
    "MARC",
    "NVDA",
    "NWRPC",
    "RRPC",
    "TRORC",
    "WRC",
]

# ---------------------------------------------------------------------------
# Wastewater API fetch
# ---------------------------------------------------------------------------


# Fetch wastewater data from github repo (geojson files)
def fetch_treatment_facilities() -> pd.DataFrame:
    return read_dataframe(WWTF_URL)


def fetch_service_areas() -> pd.DataFrame:
    return read_dataframe(SERVICE_AREA_URL)


def fetch_water_features() -> pd.DataFrame:
    return read_dataframe(WATER_FEATURES_URL)


def fetch_soil_septic_single(rpc: str) -> pd.DataFrame:
    """
    Download a single RPC soil suitability dataset.
    """
    url = SOIL_SUITABILITY_URL.format(rpc=rpc)
    try:
        return read_dataframe(url)
    except Exception as e:
        raise FileNotFoundError(
            f"No soil suitability data found for RPC '{rpc}'."
        ) from e


def load_soil_septic_multi() -> dict[str, pd.DataFrame]:
    """
    Load soil suitability data for all available RPCs.
    Returns a dictionary keyed by RPC name.
    """
    dfs = {}

    for rpc in RPCs:
        try:
            dfs[f"ww_soil_suitability_{rpc}"] = fetch_soil_septic_single(rpc)
        except FileNotFoundError:
            print(f"Skipping missing soil suitability data for {rpc}")

    return dfs


# ---------------------------------------------------------------------------
# Main scrape runner
# ---------------------------------------------------------------------------


def collect():
    return {
        "ww_treatment_facilities": fetch_treatment_facilities(),
        "ww_service_areas": fetch_service_areas(),
        # NOTE: The combined RPC file is too large to upload at once ->
        # Upload each RPC dataset to lake.RAW tables
        **load_soil_septic_multi(),
        "ww_stormwater_management_areas": fetch_water_features(),
    }


def main():
    collect()


if __name__ == "__main__":
    main()
