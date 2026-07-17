"""
**Author**:
    Ian Sargent
**Created**:
    2026-07-15
**Description**:
    Fetches Vermont CDC data from the CDC SODA API.
"""

import pandas as pd
import pyogrio
import requests

# ---------------------------------------------------------------------------
# API endpoints
# ---------------------------------------------------------------------------

# County-level PLACES data (GeoJSON)
PLACES_COUNTY_URL = "https://data.cdc.gov/resource/i46a-9kgh.geojson?$limit=5000"

# Tract-level PLACES data (SoQL query)
PLACES_TRACT_URL = "https://data.cdc.gov/resource/yjkw-uj5s.geojson"

PLACES_TRACT_QUERY = """
    SELECT *
    WHERE caseless_one_of(stateabbr, "VT")
    LIMIT 5000
"""

CDC_NOTES_URL = "https://media.githubusercontent.com/media/VERSO-UVM/react-vt-data/refs/heads/main/backend/Data/CDC/cdc_notes.csv"


# ---------------------------------------------------------------------------
# CDC API fetch
# ---------------------------------------------------------------------------

def fetch_cdc():
    """Fetch CDC PLACES datasets."""

    # County data (GeoJSON)
    places_county_df = pyogrio.read_dataframe(PLACES_COUNTY_URL)

    # Tract data (GeoJSON)
    response = requests.get(
        PLACES_TRACT_URL,
        params={"$query": PLACES_TRACT_QUERY},
        timeout=60,
    )
    response.raise_for_status()
    places_tract_df = pd.DataFrame(response.json())

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
    """Collect all CDC datasets."""
    return fetch_cdc()


if __name__ == "__main__":
    tables = collect()