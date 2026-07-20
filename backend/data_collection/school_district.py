import pandas as pd
import requests
from io import BytesIO
from pyogrio import read_dataframe

SCHOOL_DISTRICTS = "https://services1.arcgis.com/BkFxaEFNwHqX3tAw/arcgis/rest/services/FS_VCGI_OPENDATA_Boundary_SCHOOLBNDS_poly_districts_SP_v1/FeatureServer/0/query?outFields=*&where=1%3D1&f=geojson"
STORAGE_LOCATION = "../Data/school-districts"


# ---------------------------------------------------------------------------
# School District API fetch
# ---------------------------------------------------------------------------

# Fetch school district data from goverment arcgis website (geojson files)

def fetch_school_districts() -> pd.DataFrame | None:
    r = requests.get(SCHOOL_DISTRICTS, timeout=30)
    r.raise_for_status()
    df = read_dataframe(BytesIO(r.content))
    return df


# ---------------------------------------------------------------------------
# Main scrape runner
# ---------------------------------------------------------------------------


def run_school_district_scrape() -> None:
    """
    Fetch Wastewater data and save as parquet files.
    """
    school_district = fetch_school_districts()

    if school_district is not None:
        school_district.to_parquet(f"{STORAGE_LOCATION}/school_districts.parquet", index=False)


if __name__ == "__main__":
    run_school_district_scrape()