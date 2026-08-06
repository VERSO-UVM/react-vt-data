from pathlib import Path

import geopandas as gpd

DATA_DIR = Path(__file__).resolve().parents[2] / "Data" / "flood-hazard"

URL = "https://hub.arcgis.com/api/v3/datasets/b40ccd85e9ca41989e7a803f48cf5bcb_57/downloads/data?format=geojson&spatialRefId=4326&where=1%3D1"


def main():
    print("Downloading FEMA flood hazard data...")

    gdf = gpd.read_file(URL)
    gdf = gdf.to_crs("EPSG:4326")

    out = DATA_DIR / "vt-flood-hazard.parquet"
    gdf.to_parquet(out)

    print(f"Saved flood dataset to {out}")


if __name__ == "__main__":
    main()
