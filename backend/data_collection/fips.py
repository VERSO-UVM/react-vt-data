"""
**Author**:
    Ian Sargent
**Created**:
    2026-08-13
**Description**:
    Fetches the raw Vermont boundary data files
    from the GitHub repository
"""

import pandas as pd
from pyogrio import read_dataframe

COUNTY_LINES_URL = "https://raw.githubusercontent.com/VERSO-UVM/react-vt-data/refs/heads/main/backend/Data/vermont/countyLines.geojson"
MUNICIPALITIES_URL = "https://raw.githubusercontent.com/VERSO-UVM/react-vt-data/refs/heads/main/backend/Data/vermont/municipalities.json"
TRACTS_URL = "https://raw.githubusercontent.com/VERSO-UVM/react-vt-data/main/backend/Data/vermont/cb_2025_50_tract_500k/cb_2025_50_tract_500k.shp"


# Fetch county lines from github repo (geojson file)
def fetch_counties() -> pd.DataFrame:
    return read_dataframe(COUNTY_LINES_URL)


# Fetch town lines from github repo (json file)
def fetch_towns() -> pd.DataFrame:
    return read_dataframe(MUNICIPALITIES_URL)


# Fetch census tract lines from github repo (shp file)
def fetch_tracts() -> pd.DataFrame:
    return read_dataframe(TRACTS_URL)


def collect():
    return {
        "vt_county_lines": fetch_counties(),
        "vt_town_lines": fetch_towns(),
        "vt_tract_lines": fetch_tracts(),
    }


def main():
    collect()


if __name__ == "__main__":
    main()
