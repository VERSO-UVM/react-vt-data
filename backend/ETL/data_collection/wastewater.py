"""
**Author**:
    Ian Sargent
**Created**:
    2026-07-13
**Description**:
    Fetches Vermont wastewater data files from the WIM GitHub repository
"""


import pandas as pd
from pyogrio import read_dataframe

WWTF_URL = "https://raw.githubusercontent.com/VERSO-UVM/Wastewater-Infrastructure-Mapping/refs/heads/main/data/Vermont_Treatment_Facilities.geojson"
SERVICE_AREA_URL = "https://raw.githubusercontent.com/VERSO-UVM/Wastewater-Infrastructure-Mapping/main/data/Vermont_Service_Areas.geojson"
SOIL_SUITABILITY_URL = "https://raw.githubusercontent.com/VERSO-UVM/Vermont-Livability-Map/main/data/{rpc}_Soil_Septic.fgb"

RPCs = ["ACRPC", "BCRC", "CCRPC", "CVRPC", "LCPC", "MARC", "NVDA", "NWRPC", "RRPC", "TRORC", "WRC"]

# ---------------------------------------------------------------------------
# Wastewater API fetch
# ---------------------------------------------------------------------------


# Fetch wastewater data from github repo (geojson files)
def fetch_treatment_facilities() -> pd.DataFrame:
    return read_dataframe(WWTF_URL)


def fetch_service_areas() -> pd.DataFrame:
    return read_dataframe(SERVICE_AREA_URL)


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


def load_soil_septic_multi() -> pd.DataFrame:
    """
    Load and combine soil suitability data for all available RPCs.
    """
    dfs = []
    for rpc in RPCs:
        try:
            dfs.append(fetch_soil_septic_single(rpc))
        except FileNotFoundError:
            print(f"Skipping missing soil suitability data for {rpc}")

    return pd.concat(dfs, ignore_index=True)




# ---------------------------------------------------------------------------
# Main scrape runner
# ---------------------------------------------------------------------------

def collect():
    return {
        "ww_treatment_facilities": fetch_treatment_facilities(),
        "ww_service_areas": fetch_service_areas(),
        "septic_soil_suitability": load_soil_septic_multi(),
    }


def main():
    collect()


if __name__ == "__main__":
    main()
