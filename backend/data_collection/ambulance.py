import pandas as pd
import requests
from io import BytesIO
from pyogrio import read_dataframe

AMBULANCE_SERVICE_AREA = "https://services1.arcgis.com/BkFxaEFNwHqX3tAw/arcgis/rest/services/FS_VCGI_OPENDATA_Emergency_AmbulanceServiceAreas_SP_v1/FeatureServer/0/query?outFields=*&where=1%3D1&f=geojson"
STORAGE_LOCATION = "../Data/ambulance"


# ---------------------------------------------------------------------------
# Ambulance API fetch
# ---------------------------------------------------------------------------

# Fetch ambulance data from goverment arcgis website (geojson files)


def fetch_service_areas() -> pd.DataFrame | None:
    r = requests.get(AMBULANCE_SERVICE_AREA, timeout=30)
    r.raise_for_status()
    df = read_dataframe(BytesIO(r.content))
    return df


# ---------------------------------------------------------------------------
# Main scrape runner
# ---------------------------------------------------------------------------


def run_ambulance_scrape() -> None:
    """
    Fetch Wastewater data and save as parquet files.
    """
    service_areas = fetch_service_areas()

    if service_areas is not None:
        service_areas.to_parquet(
            f"{STORAGE_LOCATION}/ambulance_service_areas.parquet", index=False
        )


if __name__ == "__main__":
    run_ambulance_scrape()
