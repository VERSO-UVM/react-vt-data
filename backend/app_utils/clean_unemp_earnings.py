import pandas as pd
from pathlib import Path


def clean_unemployment_rate():
    df = pd.read_csv(
        Path("backend/Data/_Processed/acs5/unemployment_rate.csv"))
    # Add a new column for the cleaned unemployment rate
    df["Variable"] = "Unemployment Rate"

    county_names = {
        "Addison County, Vermont": 50001,
        "Bennington County, Vermont": 50003,
        "Caledonia County, Vermont": 50005,
        "Chittenden County, Vermont": 50007,
        "Essex County, Vermont": 50009,
        "Franklin County, Vermont": 50011,
        "Grand Isle County, Vermont": 50013,
        "Lamoille County, Vermont": 50015,
        "Orange County, Vermont": 50017,
        "Orleans County, Vermont": 50019,
        "Rutland County, Vermont": 50021,
        "Washington County, Vermont": 50023,
        "Windham County, Vermont": 50025,
        "Windsor County, Vermont": 50027,
    }

    df["geotype"] = "county_subdivision"

    subdivisions = df[
        df["NAME"].str.contains(
            "town|city|village|gore",
            case=False,
            na=False
        )
    ].copy()

    subdivisions["county"] = (
        subdivisions["NAME"]
        .str.extract(r", ([^,]+ County), Vermont")[0]
    )

    county_df = (
        subdivisions
        .groupby(["year", "county", "Variable"], as_index=False)
        .agg(Value=("Value", "mean"))
    )

    county_df["NAME"] = county_df["county"] + ", Vermont"
    county_df["GEOID"] = county_df["NAME"].map(county_names)
    county_df["geotype"] = "county"

    county_df = county_df[
        ["year", "GEOID", "NAME", "Value", "Variable", "geotype"]
    ]

    vt_df = (
        county_df
        .groupby(["year", "Variable"], as_index=False)
        .agg(Value=("Value", "mean"))
    )

    vt_df["NAME"] = "Vermont"
    vt_df["GEOID"] = 50
    vt_df["geotype"] = "state"

    vt_df = vt_df[
        ["year", "GEOID", "NAME", "Value", "Variable", "geotype"]
    ]

    result = pd.concat(
        [
            df.assign(geotype="county_subdivision"),
            county_df,
            vt_df,
        ],
        ignore_index=True,
    )

    return result


def clean_median_earnings():
    df = pd.read_parquet(
        Path("backend/Data/_Processed/acs5/median_earnings.parquet"))

    county_names = {
        "Addison County, Vermont": 50001,
        "Bennington County, Vermont": 50003,
        "Caledonia County, Vermont": 50005,
        "Chittenden County, Vermont": 50007,
        "Essex County, Vermont": 50009,
        "Franklin County, Vermont": 50011,
        "Grand Isle County, Vermont": 50013,
        "Lamoille County, Vermont": 50015,
        "Orange County, Vermont": 50017,
        "Orleans County, Vermont": 50019,
        "Rutland County, Vermont": 50021,
        "Washington County, Vermont": 50023,
        "Windham County, Vermont": 50025,
        "Windsor County, Vermont": 50027,
    }

    df["geotype"] = "county_subdivision"

    subdivisions = df[
        df["NAME"].str.contains(
            "town|city|village|gore",
            case=False,
            na=False
        )
    ].copy()

    subdivisions["county"] = (
        subdivisions["NAME"]
        .str.extract(r", ([^,]+ County), Vermont")[0]
    )

    county_df = (
        subdivisions
        .groupby(["year", "county", "Variable"], as_index=False)
        .agg(Value=("estimate", "mean"))
    )

    county_df["NAME"] = county_df["county"] + ", Vermont"
    county_df["GEOID"] = county_df["NAME"].map(county_names)
    county_df["geotype"] = "county"

    county_df = county_df[
        ["year", "GEOID", "NAME", "Value", "Variable", "geotype"]
    ]

    vt_df = (
        county_df
        .groupby(["year", "Variable"], as_index=False)
        .agg(Value=("Value", "mean"))
    )

    vt_df["NAME"] = "Vermont"
    vt_df["GEOID"] = 50
    vt_df["geotype"] = "state"

    vt_df = vt_df[
        ["year", "GEOID", "NAME", "Value", "Variable", "geotype"]
    ]

    result = pd.concat(
        [
            df.assign(geotype="county_subdivision"),
            county_df,
            vt_df,
        ],
        ignore_index=True,
    )

    print(result[result['geotype'] == 'state'])

    return result


clean_median_earnings()

# print("Pushing to parquet file. Overwriting . . .")
# result.to_parquet("backend/Data/_Processed/acs5/median_earnings_NEW.parquet")
