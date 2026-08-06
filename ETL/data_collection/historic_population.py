"""
**Author**:
    Ian Sargent
**Created**:
    2026-07-13
**Description**:
    Fetches the Historic Population data estimates from the VT Open Geodata Portal
    Original Raw Data Source: https://geodata.vermont.gov/datasets/84a286c51ece48488273710e1f49834e/explore
"""

import pandas as pd

RAW_URL = "https://www.arcgis.com/sharing/rest/content/items/84a286c51ece48488273710e1f49834e/data"


def collect():
    df = pd.read_csv(RAW_URL)
    return df


if __name__ == "__main__":
    df = collect()
