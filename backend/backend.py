"""
uvicorn backend:app --reload --port 6767

"""


from fastapi import FastAPI, HTTPException
from app_utils import data_loading
import json
from pathlib import Path


app = FastAPI()
DATADIR = Path(__file__).parent / "Data"
CENSUS_DATADIR = DATADIR / "Census"

CENSUS_DATASETS = {
    "housing": {
        "main": CENSUS_DATADIR / "VT_HOUSING_ALL.fgb",
        "median_home_value": CENSUS_DATADIR / "med_home_value_by_year.csv",
        "median_smoc": CENSUS_DATADIR / "med_smoc_by_year.csv"
    },
    "economic": {
        "main": CENSUS_DATADIR / "VT_ECONOMIC_ALL.fgb",
        "median_earnings": CENSUS_DATADIR / "median_earnings_by_year.csv",
        "unemployment_rate": CENSUS_DATADIR / "unemployment_rate_by_year.csv",
        "commute_habits": CENSUS_DATADIR / "commute_habits_by_year.csv",
        "commute_time": CENSUS_DATADIR / "commute_time_by_year.csv"
    },
    "demographic": {
        "main": CENSUS_DATADIR / "VT_DEMOGRAPHIC_ALL.fgb",
        "historic_population": CENSUS_DATADIR / "VT_Historic_Population.csv"
    },
    "social": {
        "main": CENSUS_DATADIR / "VT_SOCIAL_ALL.fgb"
    }
}


@app.get("/")
def read_root():
    return {"Default Message": "No endpoint specified"}


# Zoning endpoint (Hardcoded for now)
@app.get("/load/mapping/zoning")
async def read_zoning_data():
    data = data_loading.masterload(name="zoning")
    return json.loads(data.to_json())


# Flood Endpoint (Hardcoded for now)
@app.get("/load/mapping/flood_legal")
async def read_flood_data():
    data = data_loading.masterload(name="flood_legal")
    return json.loads(data.to_json())


# Soil Septic Endpoint (Hardcoded for now)
@app.get("/load/mapping/soil_septic/{rpc}")
async def read_soil_septic_data(rpc):
    data = data_loading.load_and_process_soil_septic(rpc=rpc)
    return json.loads(data.to_json())


# Load the Census "Main" Dataset by Cateogory (housing, economic, demographic, social)
@app.get("/load/census/{category}")
async def read_census_data(category: str):
    if category not in CENSUS_DATASETS:
        raise HTTPException(
            status_code=404, detail=f"Census category '{category}' was not found")

    data = data_loading.load_census_data(
        CENSUS_DATASETS[category]["main"])

    return data.to_json()


# Load the Census Dataset by `category`(housing, economic, etc.) and `subcategory`(special csv files)
@app.get("/load/census/{category}/{subcategory}")
async def read_census_data_subcat(category: str, subcategory: str):
    if category not in CENSUS_DATASETS:
        raise HTTPException(
            status_code=404, detail=f"Census category '{category}' was not found")

    if subcategory not in CENSUS_DATASETS[category]:
        raise HTTPException(
            status_code=404, detail=f"Census subcategory '{subcategory}' was not found in category '{category}'")

    data = data_loading.load_census_data(
        CENSUS_DATASETS[category][subcategory])

    return data.to_json()
