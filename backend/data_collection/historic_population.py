"""
**Author**:
    Ian Sargent
**Created**:
    2026-07-13
**Description**:
    Fetches the already cleaned Historic Population data from the csv on GitHub
    Original Raw Data Source: https://geodata.vermont.gov/datasets/84a286c51ece48488273710e1f49834e/explore
"""

import pandas as pd

URL = "https://raw.githubusercontent.com/VERSO-UVM/react-vt-data/refs/heads/main/backend/Data/Census/VT_Historic_Population.csv"


def collect():
    df = pd.read_csv(URL)
    return df


if __name__ == "__main__":
    df = collect()
