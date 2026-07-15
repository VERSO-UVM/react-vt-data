"""
**Author**:
    Ian Sargent
**Created**:
    2026-07-15
**Description**:
    Fetches Vermont CDC .csv files from our GitHub repository
"""

import pandas as pd

PLACES_URL = "https://media.githubusercontent.com/media/VERSO-UVM/react-vt-data/refs/heads/main/backend/Data/CDC/CDC_Places.csv"
NOTES_URL = "https://media.githubusercontent.com/media/VERSO-UVM/react-vt-data/refs/heads/main/backend/Data/CDC/cdc_notes.csv"

# ---------------------------------------------------------------------------
# CDC API fetch
# ---------------------------------------------------------------------------

# CDC zoning data from github repo (an fgb file)


def fetch_cdc():
    places_df = pd.read_csv(PLACES_URL)
    notes_df = pd.read_csv(NOTES_URL)

    tables = {
        "cdc_places": places_df,
        "cdc_notes": notes_df
    }
    
    return tables


# ---------------------------------------------------------------------------
# Main scrape runner
# ---------------------------------------------------------------------------


def collect():
    tables = fetch_cdc()
    return tables


if __name__ == "__main__":
    tables = collect()

