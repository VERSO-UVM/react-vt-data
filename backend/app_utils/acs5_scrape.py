"""
Fetch ACS 5-Year Data Profile tables (DP02-DP05) for Vermont
Geographies: counties + county subdivisions
Years: 2009-2024
Output: one wide CSV + parquet per table, plus tidy parquet per table
Credit: Written largely by Claude, with some fine-tuning and troubleshooting by Fitz Koch
"""

import time
import pandas as pd
import requests
from app_utils.census import tidy_census

API_KEY = "29af5488bbdb8c7d9f67b7f4ff9c9151e8c2bd0a"
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
GEOS = [
    ("county", "county:*", f"state:{STATE_FIPS}"),
    ("county_subdivision", "county subdivision:*", f"state:{STATE_FIPS}"),
]


def fetch_table(year, table, for_clause, in_clause):
    params = {
        "get": f"group({table}),NAME",
        "for": for_clause,
        "in": in_clause,
        "key": API_KEY,
    }
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


def scrape():
    # Collect raw frames per table
    all_frames = {table: [] for table in TABLES}

    for year in YEARS:
        print(f"\n=== {year} ===")
        for geo_label, for_clause, in_clause in GEOS:
            for table in TABLES:
                print(f"  {table} / {geo_label}...")
                df = fetch_table(year, table, for_clause, in_clause)
                if df is not None:
                    df["geo_type"] = geo_label
                    all_frames[table].append(df)
                time.sleep(0.1)

    # Save wide + tidy per table
    for table, frames in all_frames.items():
        label = TABLES[table]
        title = f"vt_acs5_{label}_data"
        combined = pd.concat(frames, ignore_index=True, sort=False)

        # Key columns to front
        priority = ID_VARS
        front = [c for c in priority if c in combined.columns]
        rest = [c for c in combined.columns if c not in front]
        combined = combined[front + rest]
        combined.sort_values(["year", "geo_type", "NAME"], inplace=True)
        combined.reset_index(drop=True, inplace=True)

        # Save wide
        combined.to_csv(f"{STORAGE_LOCATION}/{title}.csv", index=False)
        combined.to_parquet(f"{STORAGE_LOCATION}/{title}.parquet", index=False)
        print(f"Saved wide: {title} ({len(combined):,} rows)")

        # Tidy: run per-year so column labels are year-accurate
        tidy_frames = []
        for year in YEARS:
            year_df = combined[combined["year"] == year]
            if year_df.empty:
                continue
            try:
                tidy_year = tidy_census(year_df, year=year, id_vars=ID_VARS)
                # tag which DP table this came from
                tidy_year["table"] = table
                tidy_frames.append(tidy_year)
            except Exception as e:
                print(f"  SKIP tidy {year} / {table}: {e}")

        if tidy_frames:
            tidy = pd.concat(tidy_frames, ignore_index=True)
            tidy.to_csv(f"{STORAGE_LOCATION}/{title}_tidy.csv", index=False)
            tidy.to_parquet(f"{STORAGE_LOCATION}/{title}_tidy.parquet", index=False)
            print(f"Saved tidy: {title}_tidy ({len(tidy):,} rows)")


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
        combined.to_parquet(
            f"{STORAGE_LOCATION}/vt_acs5_combined_TIDY.parquet", index=False
        )
        print(f"Combined tidy saved: {len(combined):,} rows")


if __name__ == "__main__":
    scrape()
    merge_tidy_tables()
