from fastapi import FastAPI
from app_utils import data_loading
import json
from pathlib import Path

app = FastAPI()
DATADIR = Path(__file__).parent / "Data"


@app.get("/")
def read_root():
    return {"Default Message": "No endpoint specified"}


# Zoning endpoint (Hardcoded for now)
@app.get("/load/mapping/zoning")
def read_zoning_data():
    data = data_loading.masterload(name="zoning")
    return json.loads(data.to_json())


# Flood Endpoint (Hardcoded for now)
@app.get("/load/mapping/flood_legal")
def read_flood_data():
    data = data_loading.masterload(name="flood_legal")
    return json.loads(data.to_json())


# Soil Septic Endpoint (Hardcoded for now)
@app.get("/load/mapping/soil_septic/{rpc}")
def read_soil_septic_data(rpc):
    data = data_loading.load_and_process_soil_septic(rpc=rpc)
    return json.loads(data.to_json())


# Census Housing Endpoint (Hardcoded for now)
@app.get("/load/census/housing")
def read_census_housing_data():
    data = data_loading.load_census_data(DATADIR / "Census/VT_HOUSING_ALL.fgb")
    return data.to_json()


# Census Economics Endpoint (Hardcoded for now)
@app.get("/load/census/economic")
def read_census_economic_data():
    data = data_loading.load_census_data(
        DATADIR / "Census/VT_ECONOMIC_ALL.fgb")
    return data.to_json()


# Census Demographics Endpoint (Hardcoded for now)
@app.get("/load/census/demographic")
def read_census_demographic_data():
    data = data_loading.load_census_data(
        DATADIR / "Census/VT_DEMOGRAPHIC_ALL.fgb")
    return data.to_json()


# Census Social Endpoint (Hardcoded for now)
@app.get("/load/census/social")
def read_census_social_data():
    data = data_loading.load_census_data(DATADIR / "Census/VT_SOCIAL_ALL.fgb")
    return data.to_json()
