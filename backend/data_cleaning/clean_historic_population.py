"""
**Author**:
    Ian Sargent
**Created**:
    2026-07-13
**Description**:
    Data cleaning script for the raw `historic_population` table in the DuckLake
**Run with**:
python -m data_cleaning.clean_historic_population
"""

import pandas as pd

from lake_build import con


def read_raw_data() -> pd.DataFrame:
    raw_df = con.execute(
        """--sql
        SELECT * 
        FROM lake.RAW.historic_population
        """
    ).df()

    return raw_df


def clean_column_names(df: pd.DataFrame):
    """
    Cleans historic_population data column names
    """
    # Make all column names lowercase
    df.columns = df.columns.str.lower()
    # Strip "year" from column names
    df.columns = df.columns.str.replace("^year", "", regex=True)
    # Rename geoid column
    df.rename(columns={"_geoid": "geoid"}, inplace=True)
    # Add a geo_type column for aggregation
    df["geo_type"] = "town"


def long_format(df: pd.DataFrame):
    """
    Turns raw historic_population estimates data into long_format
    """
    year_cols = df.columns[df.columns.astype(str).str.contains(r"\d")]

    df_long = pd.melt(
        df,
        id_vars=["geoid", "town", "county", "geo_type"],
        value_vars=year_cols,
        var_name="year",
        value_name="Population",
    )
    df_long["year"] = df_long["year"].astype(int)

    return df_long


def add_NAME_column(long_df: pd.DataFrame):
    import requests

    json_file = "https://raw.githubusercontent.com/VERSO-UVM/react-vt-data/refs/heads/main/frontend/public/data/municipalites.json"
    response = requests.get(json_file)
    geo = response.json()

    long_df["geoid"] = long_df["geoid"].astype(str).str.zfill(10)
    geo_lookup = {
        str(feat["properties"]["GEOID"]).zfill(10): feat["properties"]["NAME"]
        for feat in geo["features"]
    }

    long_df["NAME"] = long_df["geoid"].map(geo_lookup)

    return long_df


def add_population_aggregations(df: pd.DataFrame):
    """
    Aggregates town-level population to county and state levels,
    and appends them as additional rows in the long-format dataframe.
    """
    df["county_geoid"] = df["geoid"].astype(str).str[:5]
    # County-level aggregation
    county_df = df.groupby(["county_geoid", "county", "year"], as_index=False)[
        "Population"
    ].sum()
    county_df["NAME"] = county_df["county"] + " County, Vermont"
    county_df["geo_type"] = "county"
    county_df = county_df.rename(columns={"county_geoid": "geoid"})

    # State-level aggregation
    state_df = df.groupby("year", as_index=False)["Population"].sum()
    state_df["NAME"] = "Vermont"
    state_df["geoid"] = "50"  # Vermont's state FIPS code
    state_df["geo_type"] = "state"

    # Align columns before concatenating
    cols = ["geoid", "NAME", "year", "Population", "geo_type"]

    town_df = df[cols]
    county_df = county_df[cols]
    state_df = state_df[cols]

    combined = pd.concat([town_df, county_df, state_df], ignore_index=True)

    return combined


def clean():
    # Get raw dataframe from DuckLake RAW tables
    raw_df = read_raw_data()
    # Clean column names
    clean_column_names(raw_df)
    # Melt DataFrame into long format (Cols: "geoid", "NAME", "year", "Population", "geo_type")
    df_long = long_format(raw_df)
    # Add a census-style "NAME" column for easier filtering
    df_long_clean = add_NAME_column(df_long)
    # Reorder columns
    column_order = ["geoid", "NAME", "county", "town", "year", "Population", "geo_type"]
    df = df_long_clean[column_order]
    # Append county + state aggregations (total sum)
    df = add_population_aggregations(df)

    return df


def add_to_lake(clean_df: pd.DataFrame):
    """
    Writes the cleaned, long-format historic population dataframe
    to the CLEANED schema in DuckLake.
    """
    con.execute(
        """--sql
        CREATE OR REPLACE TABLE lake.CLEANED.VCGI_historicPopulation_timeseries AS
        SELECT * FROM clean_df
        """
    )


def main():
    clean_df = clean()
    add_to_lake(clean_df)


if __name__ == "__main__":
    main()
