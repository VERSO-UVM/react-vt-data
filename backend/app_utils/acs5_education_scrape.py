"""
Fetch ACS 5-Year B15003 for Vermont educational attainment (population 25+):

  B15003 - Educational Attainment for the Population 25 Years and Over

Variables are grouped into six display categories matching the Annual Report:
  No High School Diploma   – B15003_002E–016E (no schooling through 12th, no diploma)
  High School Graduate     – B15003_017E + 018E (diploma + GED)
  Some College, No Degree  – B15003_019E + 020E
  Associate's Degree       – B15003_021E
  Bachelor's Degree        – B15003_022E
  Postgraduate Degree      – B15003_023E–025E (master's + professional + doctorate)

Geographies: counties + county subdivisions
Years: 2009-2024
Output: vt_acs5_b_education_tidy.parquet
"""

import time

import pandas as pd
import requests

from app_utils.census import split_name_col

API_KEY = "29af5488bbdb8c7d9f67b7f4ff9c9151e8c2bd0a"
BASE_URL = "https://api.census.gov/data/{year}/acs/acs5"
STATE_FIPS = "50"
YEARS = list(range(2009, 2025))
STORAGE_LOCATION = "Data/Census/ACS_5"

GEOS = [
    ("county", "county:*", f"state:{STATE_FIPS}"),
    ("county_subdivision", "county subdivision:*", f"state:{STATE_FIPS}"),
]

EDUC_TOTAL = "B15003_001E"

# Suffixes of B15003 variables that belong to each display category.
# e.g. range(2, 17) → B15003_002E … B15003_016E
EDUC_GROUPS = {
    "No High School Diploma": list(range(2, 17)),
    "High School Graduate": [17, 18],
    "Some College, No Degree": [19, 20],
    "Associate's Degree": [21],
    "Bachelor's Degree": [22],
    "Postgraduate Degree": [23, 24, 25],
}


def educ_vars():
    """Build the full list of B15003 variable codes to request."""
    codes = [EDUC_TOTAL]
    for suffixes in EDUC_GROUPS.values():
        for s in suffixes:
            codes.append(f"B15003_{str(s).zfill(3)}E")
    return list(dict.fromkeys(codes))


def fetch(year, variables, for_clause, in_clause):
    params = {
        "get": ",".join(variables) + ",NAME",
        "for": for_clause,
        "in": in_clause,
        "key": API_KEY,
    }
    try:
        r = requests.get(BASE_URL.format(year=year), params=params, timeout=30)
        r.raise_for_status()
        data = r.json()
        df = pd.DataFrame(data[1:], columns=data[0])
        df["year"] = year
        for c in df.columns:
            if c[0] == "B":
                df[c] = pd.to_numeric(df[c], errors="coerce")
        return df
    except Exception as e:
        print(f"  SKIP {year} / {for_clause}: {e}")
        return None


def pct(val, total):
    try:
        if total and total > 0:
            return round(val / total * 100, 1)
    except Exception:
        pass
    return None


def compute_tidy(df):
    rows = []

    for _, row in df.iterrows():
        base = {
            "year": row["year"],
            "geo_type": row["geo_type"],
            "NAME": row["NAME"],
            "state": row.get("state"),
            "county": row.get("county"),
        }

        total = row.get(EDUC_TOTAL)

        for label, suffixes in EDUC_GROUPS.items():
            count = sum(
                row.get(f"B15003_{str(s).zfill(3)}E") or 0 for s in suffixes
            )
            rows.append(
                {
                    **base,
                    "Section": "Educational Attainment",
                    "Variable": label,
                    "Value": count,
                    "Percent": pct(count, total),
                }
            )

    return pd.DataFrame(rows)


def scrape():
    vars = educ_vars()
    all_frames = []

    for year in YEARS:
        print(f"\n=== {year} ===")
        for geo_label, for_clause, in_clause in GEOS:
            print(f"  B15003 / {geo_label}...")
            df = fetch(year, vars, for_clause, in_clause)
            if df is None:
                continue
            df["geo_type"] = geo_label
            all_frames.append(df)
            time.sleep(0.1)

    combined = pd.concat(all_frames, ignore_index=True, sort=False)
    tidy = compute_tidy(combined)

    tidy.sort_values(["year", "geo_type", "NAME"], inplace=True)
    tidy = split_name_col(tidy)
    tidy.reset_index(drop=True, inplace=True)

    out = f"{STORAGE_LOCATION}/vt_acs5_b_education_tidy.parquet"
    tidy.to_parquet(out, index=False)
    print(f"\nDone. {len(tidy):,} rows -> {out}")


if __name__ == "__main__":
    scrape()
