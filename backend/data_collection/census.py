"""
Open Research Community Accelorator
Vermont Data App

Census Utility Functions
"""

import pandas as pd
import requests
from bs4 import BeautifulSoup


def split_name_col(census_gdf, keep_name: bool = True):
    """
    Splits the "NAME" column into "Jurisdiction" and "County" columns.
    By default the original NAME column is preserved (keep_name=True).

    @param census_gdf: A census-style DataFrame with a "NAME" column.
    @param keep_name:  When True (default) the NAME column is kept alongside
                       the new Jurisdiction and County columns.
    @return: The dataset with Jurisdiction and County added.
    """
    census_gdf[["Jurisdiction", "County"]] = census_gdf["NAME"].str.extract(
        r"^(.*?),\s*(.*?) County,"
    )
    if not keep_name:
        census_gdf = census_gdf.drop(columns="NAME")

    if "year" in census_gdf.columns:
        census_gdf["year"] = census_gdf["year"].astype(str)
    return census_gdf


def get_census_cols(year: int):
    r = requests.get(
        f"https://api.census.gov/data/{year}/acs/acs5/profile/variables.html"
    )
    soup = BeautifulSoup(r.content, "html.parser")

    # get table headers as keys
    keys = [
        th.get_text(strip=True, separator=" ")
        for tr in soup.find_all("tr")
        for th in tr.find_all("th")
    ]

    # build rows
    rows = []
    for tr in soup.find_all("tr"):
        cells = [
            td.get_text(strip=True, separator=" ") for td in tr.find_all("td")
        ]  # cols
        if cells:
            rows.append(cells)

    df = pd.DataFrame(rows, columns=keys)
    df = df[["Name", "Label"]].copy()
    df.dropna(inplace=True)
    return df


def split_to_cols(s, cols):
    parts = [p.strip() for p in s.split("!!")]

    while len(parts) < len(cols):
        parts.append("")

    first = parts[0 : len(cols) - 1]
    second = parts[len(cols) - 1 :]
    second = [": ".join(second)]

    return first + second


def relabel_census_cols(df):
    # Splits apart the labels so we can filter across them
    cols = ["Measure", "Category", "Subcategory", "Variable"]

    # Keep only rows where the label is structured by "!!" (Issues with "Geography" rows)
    df_clean = df[df["Label"].str.contains("!!")].copy()

    # Reset index to avoid merging issues
    df_clean.reset_index(drop=True, inplace=True)

    splits = df_clean["Label"].apply(lambda x: list(split_to_cols(x, cols)))
    splits_df = pd.DataFrame(splits.tolist(), columns=cols)

    # Create the total categories
    splits_df.loc[
        (splits_df["Subcategory"].notna()) & (splits_df["Variable"] == ""), "Variable"
    ] = "Total"

    name_df = pd.concat([df_clean, splits_df], axis=1)

    return name_df


def merge_census_cols(name_df, data_gdf, id_vars: list | None):
    id_vars = id_vars or [
        "GEOID",
        "geometry",
        "Jurisdiction",
        "County",
    ]

    # Melt the gdf into tidy format
    data_gdf[id_vars]
    df_long = data_gdf.melt(
        id_vars=id_vars,
        value_vars=data_gdf.columns.difference(id_vars),
        var_name="Code",
        value_name="Value",
    )

    # Merge to get the right names and drop the cols
    return pd.merge(left=df_long, right=name_df, left_on="Code", right_on="Name").drop(
        columns=["Code", "Name", "Label"]
    )


def tidy_census(census_gdf, year=2019, id_vars: list | None = None):
    # wrapper func to rename codes in func
    name_df = get_census_cols(year)
    name_df = relabel_census_cols(name_df)
    return merge_census_cols(name_df, census_gdf, id_vars)
