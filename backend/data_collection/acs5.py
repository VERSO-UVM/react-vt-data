"""
Fetch ACS 5-Year Data Profile tables (DP02-DP05) for Vermont
Geographies: counties + county subdivisions + Vermont statewide + United States
Years: 2009-2024
Output: one wide CSV + parquet per table, plus tidy parquet per table
Credit: Written largely by Claude, with some fine-tuning and troubleshooting by Fitz Koch

Geography selection
-------------------
Pass --geos on the CLI to scrape only specific geographic levels.
Use --append to merge new rows into existing files instead of overwriting.
"""

import time

import pandas as pd
import requests
from bs4 import BeautifulSoup

from data_collection.base import ALL_GEOS

API_KEY = (
    "29af5488bbdb8c7d9f67b7f4ff9c9151e8c2bd0a"  # TODO: Get this as a .env variable!!!
)
BASE_URL = "https://api.census.gov/data/{year}/acs/acs5/profile"
STATE_FIPS = "50"  # Vermont
TABLES = {
    "DP02": "Social",
    "DP03": "Economic",
    "DP04": "Housing",
    "DP05": "Demographic",
}
YEARS = list(range(2009, 2025))
STORAGE_LOCATION = "Data/Census/ACS_5"
ID_VARS = ["year", "geo_type", "table", "NAME", "state", "county"]

# Default geos list in (label, for_clause, in_clause) format
GEOS = [(k, *v) for k, v in ALL_GEOS.items()]


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


def fetch_table(year, table, for_clause, in_clause):
    params = {
        "get": f"group({table}),NAME",
        "for": for_clause,
        "key": API_KEY,
    }
    if in_clause:  # state/national geos have no "in" clause
        params["in"] = in_clause
    try:
        r = requests.get(BASE_URL.format(year=year), params=params, timeout=30)
        r.raise_for_status()
        data = r.json()
        headers = data[0]
        # deduplicate column names
        seen = {}
        deduped = []
        for h in headers:
            if h in seen:
                seen[h] += 1
                deduped.append(f"{h}_{seen[h]}")
            else:
                seen[h] = 0
                deduped.append(h)
        df = pd.DataFrame(data[1:], columns=deduped)
        df["year"] = year
        df["table"] = table
        return df
    except Exception as e:
        print(f"  SKIP {year} / {table} / {for_clause}: {e}")
        return None


def run_acs5_scrape(geos: list = GEOS, append: bool = False):
    # Collect raw frames per table
    all_frames = {table: [] for table in TABLES}

    for year in YEARS:
        print(f"\n=== {year} ===")
        for geo_label, for_clause, in_clause in geos:
            for table in TABLES:
                print(f"  {table} / {geo_label}...")
                df = fetch_table(year, table, for_clause, in_clause)
                if df is not None:
                    df["geo_type"] = geo_label
                    all_frames[table].append(df)
                time.sleep(0.1)

    # Save wide + tidy per table
    results = {}
    for table, frames in all_frames.items():
        if not frames:
            print(f"  No frames for {table}, skipping.")
            continue

        label = TABLES[table]
        title = f"vt_acs5_{label}_data"
        combined = pd.concat(frames, ignore_index=True, sort=False)

        # Key columns to front
        front = [c for c in ID_VARS if c in combined.columns]
        rest = [c for c in combined.columns if c not in front]
        combined = combined[front + rest]
        combined.sort_values(["year", "geo_type", "NAME"], inplace=True)
        combined.reset_index(drop=True, inplace=True)

        wide_parquet_path = f"{STORAGE_LOCATION}/{title}.parquet"
        # wide_csv_path = f"{STORAGE_LOCATION}/{title}.csv"

        if append:
            new_names = set(combined["NAME"].unique())
            # --- Wide ---
            try:
                existing_wide = pd.read_parquet(wide_parquet_path)
                existing_wide = existing_wide[~existing_wide["NAME"].isin(new_names)]
                combined = pd.concat([existing_wide, combined], ignore_index=True)
                combined.sort_values(["year", "geo_type", "NAME"], inplace=True)
                combined.reset_index(drop=True, inplace=True)
                print(f"  Wide append: kept {len(existing_wide):,} existing rows.")
            except FileNotFoundError:
                pass

        # combined.to_csv(wide_csv_path, index=False)
        # combined.to_parquet(wide_parquet_path, index=False)
        # print(f"Saved wide: {title} ({len(combined):,} rows)")

        # Tidy: run per-year so column labels are year-accurate
        tidy_frames = []
        for year in YEARS:
            year_df = combined[combined["year"] == year]
            if year_df.empty:
                continue
            try:
                tidy_year = tidy_census(year_df, year=year, id_vars=ID_VARS)
                tidy_year["table"] = table
                tidy_frames.append(tidy_year)
            except Exception as e:
                print(f"  SKIP tidy {year} / {table}: {e}")

        if tidy_frames:
            tidy = pd.concat(tidy_frames, ignore_index=True)

            label = TABLES[table]

            results[f"acs5_{label.lower()}"] = tidy
            # tidy_parquet_path = f"{STORAGE_LOCATION}/{title}_tidy.parquet"
            # tidy_csv_path = f"{STORAGE_LOCATION}/{title}_tidy.csv"

            # No separate append needed for tidy: it's derived from the
            # already-merged wide frame, so it naturally contains all geos.

            # tidy.to_csv(tidy_csv_path, index=False)
            # tidy.to_parquet(tidy_parquet_path, index=False)
            # print(f"Saved tidy: {title}_tidy ({len(tidy):,} rows)")

    return results


def merge_tidy_tables():
    """Merge the per-table tidy parquets into one combined file."""
    tidy_frames = []
    for table, label in TABLES.items():
        path = f"{STORAGE_LOCATION}/vt_acs5_{label}_data_tidy.parquet"
        try:
            tidy_frames.append(pd.read_parquet(path))
        except Exception as e:
            print(f"  SKIP {path}: {e}")

    if tidy_frames:
        combined = pd.concat(tidy_frames, ignore_index=True)
        # combined.to_parquet(f"{STORAGE_LOCATION}/vt_acs5_combined_TIDY.parquet", index=False)
        # print(f"Combined tidy saved: {len(combined):,} rows")
        return combined

    return


def collect(
    geos=GEOS,
    append=False,
):
    """
    Collect ACS profile tables and return tidy datasets.
    """

    tables = run_acs5_scrape(
        geos=geos,
        append=append,
    )

    return tables


if __name__ == "__main__":
    df = collect()
