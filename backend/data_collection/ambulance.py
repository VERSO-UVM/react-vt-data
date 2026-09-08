from io import BytesIO

import pandas as pd
import requests
from pyogrio import read_dataframe

AMBULANCE_SERVICE_AREA = "https://services1.arcgis.com/BkFxaEFNwHqX3tAw/arcgis/rest/services/FS_VCGI_OPENDATA_Emergency_AmbulanceServiceAreas_SP_v1/FeatureServer/0/query?outFields=*&where=1%3D1&f=geojson"


# ---------------------------------------------------------------------------
# Ambulance API fetch
# ---------------------------------------------------------------------------

# Fetch ambulance data from goverment arcgis website (geojson files)


def fetch_ambulance_service_areas() -> pd.DataFrame | None:
    r = requests.get(AMBULANCE_SERVICE_AREA, timeout=30)
    r.raise_for_status()
    df = read_dataframe(BytesIO(r.content))
    return df


# ---------------------------------------------------------------------------
# Main scrape runner
# ---------------------------------------------------------------------------


def collect() -> None:
    """
    Fetch ambulance data and save as parquet files.
    """
    df = fetch_ambulance_service_areas()
    return df


if __name__ == "__main__":
    df = collect()
