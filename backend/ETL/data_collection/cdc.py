"""
**Author**:
    Ian Sargent
**Created**:
    2026-07-15
**Description**:
    Fetches Vermont CDC data from the CDC SODA API (In "Open Data Format")
"""

import pandas as pd
import geopandas as gpd
import requests
from io import BytesIO

# ---------------------------------------------------------------------------
# API endpoints
# ---------------------------------------------------------------------------

# County-level PLACES data (GeoJSON)
PLACES_COUNTY_URL = "https://data.cdc.gov/resource/swc5-untb.geojson?$query=SELECT%0A%20%20%60year%60%2C%0A%20%20%60stateabbr%60%2C%0A%20%20%60statedesc%60%2C%0A%20%20%60locationname%60%2C%0A%20%20%60datasource%60%2C%0A%20%20%60category%60%2C%0A%20%20%60measure%60%2C%0A%20%20%60data_value_unit%60%2C%0A%20%20%60data_value_type%60%2C%0A%20%20%60data_value%60%2C%0A%20%20%60data_value_footnote_symbol%60%2C%0A%20%20%60data_value_footnote%60%2C%0A%20%20%60low_confidence_limit%60%2C%0A%20%20%60high_confidence_limit%60%2C%0A%20%20%60totalpopulation%60%2C%0A%20%20%60totalpop18plus%60%2C%0A%20%20%60locationid%60%2C%0A%20%20%60categoryid%60%2C%0A%20%20%60measureid%60%2C%0A%20%20%60datavaluetypeid%60%2C%0A%20%20%60short_question_text%60%2C%0A%20%20%60geolocation%60%0AWHERE%20caseless_one_of(%60stateabbr%60%2C%20%22VT%22)"

# Tract-level PLACES data (SoQL query)
PLACES_TRACT_URL = "https://data.cdc.gov/resource/cwsq-ngmh.geojson"

PLACES_TRACT_QUERY = """
    SELECT *
    WHERE caseless_one_of(stateabbr, "VT")
    LIMIT 30000
"""

CDC_NOTES_URL = "https://media.githubusercontent.com/media/VERSO-UVM/react-vt-data/refs/heads/main/backend/Data/CDC/cdc_notes.csv"


# ---------------------------------------------------------------------------
# CDC API fetch
# ---------------------------------------------------------------------------

def fetch_cdc():
    """Fetch CDC PLACES datasets."""

    # County data (GeoJSON)
    county_resp = requests.get(PLACES_COUNTY_URL, timeout=60)
    county_resp.raise_for_status()
    places_county_df = gpd.read_file(BytesIO(county_resp.content))

    # Tract data (GeoJSON) - also a FeatureCollection, parse with geopandas
    tract_resp = requests.get(
        PLACES_TRACT_URL,
        params={"$query": PLACES_TRACT_QUERY},
        timeout=60,
    )
    tract_resp.raise_for_status()
    places_tract_df = gpd.read_file(BytesIO(tract_resp.content))

    # Notes dataset
    notes_df = pd.read_csv(CDC_NOTES_URL)

    return {
        "cdc_places_county": places_county_df,
        "cdc_places_tract": places_tract_df,
        "cdc_notes": notes_df
    }


# ---------------------------------------------------------------------------
# Main scrape runner
# ---------------------------------------------------------------------------

def collect():
    """
    Collect all CDC datasets.
    """
    return fetch_cdc()


if __name__ == "__main__":
    tables = collect()