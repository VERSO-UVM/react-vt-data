"""
uvicorn endpoints:app --reload --port 6767
"""

import json
import logging
from pathlib import Path

from fastapi import Body, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app_utils import data_loading
from app_utils.df_filtering import FilterState

logger = logging.getLogger(__name__)
# Notes --- caching the filter states, too, would be a good idea.


app = FastAPI()
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:6767",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
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


class FilterRequest(BaseModel):
    filters: dict[str, list[str]] = {}
    format: str | None = "geojson"


@app.get("/")
def read_root():
    return {"Default Message": "No endpoint specified"}


# Zoning endpoint (Hardcoded for now)
@app.post("/load/mapping/zoning")
async def read_zoning_data(request: FilterRequest = Body(None)):
    df = data_loading.masterload(name="zoning")

    if request.filters:
        filter_dict = request.filters

        # Optional: validate columns exist
        for col in filter_dict.keys():
            if col not in df.columns:
                raise HTTPException(
                    status_code=400, detail=f"Column '{col}' does not exist")

        Filter = FilterState(df=df, filter_columns=list(filter_dict.keys()))
        Filter.set_filters(filter_dict)
        df = Filter.apply_filters(df)

    if request.format == "aggregated_acres":
        result = (
            df.groupby("District Type")["Acres"]
              .sum()
              .reset_index()
              .rename(columns={"District Type": "District Type"})
        )
        result["hex_color"] = df.groupby("District Type")[
            "hex_color"].first().values
        return result.to_dict(orient="records")

    return df.to_json()


@app.get("/load/mapping/zoning/filters")
async def read_zoning_data():
    data = data_loading.masterload(name="zoning")
    filter_columns = ["County", "Jurisdiction", "District Name"]
    logger.info(f"cols are {filter_columns}")
    Filter = FilterState(data, filter_columns=filter_columns)
    return {
        "tree": Filter.tree,
        "labels": filter_columns
    }


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


class FilterRequest(BaseModel):
    filter_dict: dict


# Load the Census "Main" Dataset by Cateogory (housing, economic, demographic, social)
@app.post("/load/census/{category}")
async def read_census_data(category: str, request: FilterRequest = None):
    filter_dict = request.filter_dict if request else {}
    if category not in CENSUS_DATASETS:
        raise HTTPException(
            status_code=404, detail=f"Census category '{category}' was not found")

    data = data_loading.load_census_data(
        CENSUS_DATASETS[category]["main"])

    filters = FilterState(df=data, filter_columns=list(filter_dict.keys()))
    for col, value in filter_dict.items():
        filters.selections[col] = [value]
    data_filtered = filters.apply_filters()

    if data_filtered.empty:
        raise HTTPException(
            status_code=404, detail=f"No data for given filters: {filter_dict}")

    return data_filtered.to_json()


# Load the Census Dataset by `category`(housing, economic, etc.) and `subcategory`(special csv files)
@app.post("/load/census/{category}/{subcategory}")
async def read_census_data_subcat(category: str, subcategory: str = 'main', request: FilterRequest = None):
    filter_dict = request.filter_dict if request else {}
    if category not in CENSUS_DATASETS:
        raise HTTPException(
            status_code=404, detail=f"Census category '{category}' was not found")
    if subcategory not in CENSUS_DATASETS[category]:
        raise HTTPException(
            status_code=404, detail=f"Census subcategory '{subcategory}' was not found in category '{category}'")

    data = data_loading.load_census_data(
        CENSUS_DATASETS[category][subcategory])

    filters = FilterState(df=data, filter_columns=list(filter_dict.keys()))

    for col, value in filter_dict.items():
        filters.selections[col] = [value]

    data_filtered = filters.apply_filters()

    if data_filtered.empty:
        raise HTTPException(
            status_code=404, detail=f"No data found for the given filters: {filter_dict}")

    return data_filtered.to_json()
