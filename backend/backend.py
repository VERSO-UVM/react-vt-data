from fastapi import FastAPI
from app_utils import data_loading
import json


app = FastAPI()


@app.get("/")
def read_root():
    return {"Default Message": "No endpoint specified"}


@app.get("/load/zoning")
def read_zoning():
    zoning_data = data_loading.load_zoning_data()
    return json.loads(zoning_data.to_json())
