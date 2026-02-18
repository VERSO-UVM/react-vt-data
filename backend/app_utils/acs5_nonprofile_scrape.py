"""
Fetch ACS 5-Year B-tables for Vermont demographics:
  B01001 - Age by Sex
  B01002 - Median Age
  B02001 - Race
  B03003 - Hispanic or Latino origin

Geographies: counties + county subdivisions
Years: 2009-2024
Output: vt_acs5_b_demographics_tidy.parquet

Each row in the output represents one variable for one geography for one year,
with both the raw count (Value) and percentage of total population (Percent).
"""

import time

import pandas as pd
import requests

API_KEY = "29af5488bbdb8c7d9f67b7f4ff9c9151e8c2bd0a"
BASE_URL = "https://api.census.gov/data/{year}/acs/acs5"
STATE_FIPS = "50"
YEARS = list(range(2009, 2025))
STORAGE_LOCATION = "Data/Census/ACS_5"

GEOS = [
    ("county", "county:*", f"state:{STATE_FIPS}"),
    ("county_subdivision", "county subdivision:*", f"state:{STATE_FIPS}"),
]

# --- Age bands ---
# B01001 breaks age into 5-year bands, separately for male and female.
# We add male + female together to get total counts per age band.
# The numbers here are the row suffixes in the variable codes,
# e.g. range(3, 7) means B01001_003E, B01001_004E, B01001_005E, B01001_006E
AGE_BANDS = {
    "Under 18": {"male": range(3, 7), "female": range(27, 31)},
    "18 to 24": {"male": range(7, 11), "female": range(31, 35)},
    "25 to 34": {"male": range(11, 13), "female": range(35, 37)},
    "35 to 44": {"male": range(13, 15), "female": range(37, 39)},
    "45 to 54": {"male": range(15, 17), "female": range(39, 41)},
    "55 to 64": {"male": range(17, 20), "female": range(41, 44)},
    "65 to 74": {"male": range(20, 23), "female": range(44, 47)},
    "75 Plus": {"male": range(23, 26), "female": range(47, 50)},
}

# --- Race variables ---
# B02001 has one row per race category. Each code is a single variable.
# We divide each by B02001_001E (total) to get percentages.
RACE_VARS = {
    "White": "B02001_002E",
    "Black or African American": "B02001_003E",
    "American Indian and Alaska Native": "B02001_004E",
    "Asian": "B02001_005E",
    "Native Hawaiian and Other Pacific Islander": "B02001_006E",
    "Some other race": "B02001_007E",
    "Two or more races": "B02001_008E",
}
RACE_TOTAL = "B02001_001E"

# --- Hispanic variables ---
# B03003 is separate from race — Hispanic is an ethnicity in Census methodology.
# B03003_001E is total, B03003_003E is Hispanic or Latino.
HISPANIC_VARS = {
    "Hispanic or Latino (of any race)": "B03003_003E",
}
HISPANIC_TOTAL = "B03003_001E"


def b01001_vars():
    """Build the list of all B01001 variable codes we need to request."""
    vars = ["B01001_001E", "B01001_002E", "B01001_026E"]  # total pop, male, female
    for band in AGE_BANDS.values():
        for i in band["male"]:
            vars.append(f"B01001_{str(i).zfill(3)}E")
        for i in band["female"]:
            vars.append(f"B01001_{str(i).zfill(3)}E")
    return list(dict.fromkeys(vars))  # deduplicate, preserve order


def fetch(year, variables, for_clause, in_clause):
    """Request a set of variables from the Census API for a given year and geography."""
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
        # cast all estimate columns to numeric
        for c in df.columns:
            if c[0] == "B":
                df[c] = pd.to_numeric(df[c], errors="coerce")
        return df
    except Exception as e:
        print(f"  SKIP {year} / {for_clause}: {e}")
        return None


def pct(val, total):
    """Compute percentage, returning None if total is missing or zero."""
    try:
        if total and total > 0:
            return round(val / total * 100, 1)
    except Exception:
        pass
    return None


def compute_tidy(df):
    """
    Convert wide-format Census rows into a tidy format with one row per variable.

    Input: one row per geography per year, with hundreds of columns (one per Census variable)
    Output: one row per (geography, year, variable), with Value and Percent columns
    """
    rows = []

    for _, row in df.iterrows():
        # Shared fields that go on every output row for this geography/year
        base = {
            "year": row["year"],
            "geo_type": row["geo_type"],
            "NAME": row["NAME"],
            "state": row.get("state"),
            "county": row.get("county"),
        }

        # --- Age/Sex (from B01001) ---
        pop_total = row.get("B01001_001E")
        male = row.get("B01001_002E")
        female = row.get("B01001_026E")
        median = row.get("B01002_001E")

        rows.append(
            {
                **base,
                "Section": "Age/Sex",
                "Variable": "Population (ACS)",
                "Value": pop_total,
                "Percent": None,
            }
        )
        rows.append(
            {
                **base,
                "Section": "Age/Sex",
                "Variable": "Male",
                "Value": male,
                "Percent": pct(male, pop_total),
            }
        )
        rows.append(
            {
                **base,
                "Section": "Age/Sex",
                "Variable": "Female",
                "Value": female,
                "Percent": pct(female, pop_total),
            }
        )
        rows.append(
            {
                **base,
                "Section": "Age/Sex",
                "Variable": "Median Age",
                "Value": median,
                "Percent": None,
            }
        )

        for band_name, codes in AGE_BANDS.items():
            count = sum(
                row.get(f"B01001_{str(i).zfill(3)}E") or 0 for i in codes["male"]
            )
            count += sum(
                row.get(f"B01001_{str(i).zfill(3)}E") or 0 for i in codes["female"]
            )
            rows.append(
                {
                    **base,
                    "Section": "Age/Sex",
                    "Variable": band_name,
                    "Value": count,
                    "Percent": pct(count, pop_total),
                }
            )

        # --- Race (from B02001) ---
        # Race has its own total (should match pop_total but we use the table's own total to be safe)
        race_total = row.get(RACE_TOTAL)
        for label, code in RACE_VARS.items():
            val = row.get(code)
            rows.append(
                {
                    **base,
                    "Section": "Race",
                    "Variable": label,
                    "Value": val,
                    "Percent": pct(val, race_total),
                }
            )

        # --- Hispanic (from B03003) ---
        hisp_total = row.get(HISPANIC_TOTAL)
        for label, code in HISPANIC_VARS.items():
            val = row.get(code)
            rows.append(
                {
                    **base,
                    "Section": "Hispanic",
                    "Variable": label,
                    "Value": val,
                    "Percent": pct(val, hisp_total),
                }
            )

    return pd.DataFrame(rows)


def scrape():
    age_vars = b01001_vars()
    race_vars = [RACE_TOTAL] + list(RACE_VARS.values())
    hispanic_vars = [HISPANIC_TOTAL] + list(HISPANIC_VARS.values())
    median_vars = ["B01002_001E"]

    all_frames = []

    for year in YEARS:
        print(f"\n=== {year} ===")

        for geo_label, for_clause, in_clause in GEOS:
            # Fetch each table separately then merge on NAME + geo identifiers
            print(f"  B01001 / {geo_label}...")
            df = fetch(year, age_vars, for_clause, in_clause)
            if df is None:
                continue

            merge_cols = ["NAME", "state"] + (
                ["county"] if "county" in df.columns else []
            )

            print(f"  B01002 / {geo_label}...")
            df_med = fetch(year, median_vars, for_clause, in_clause)
            if df_med is not None:
                df = df.merge(
                    df_med[merge_cols + ["B01002_001E"]], on=merge_cols, how="left"
                )

            print(f"  B02001 / {geo_label}...")
            df_race = fetch(year, race_vars, for_clause, in_clause)
            if df_race is not None:
                df = df.merge(
                    df_race[merge_cols + race_vars], on=merge_cols, how="left"
                )

            print(f"  B03003 / {geo_label}...")
            df_hisp = fetch(year, hispanic_vars, for_clause, in_clause)
            if df_hisp is not None:
                df = df.merge(
                    df_hisp[merge_cols + hispanic_vars], on=merge_cols, how="left"
                )

            df["geo_type"] = geo_label
            all_frames.append(df)
            time.sleep(0.1)

    combined = pd.concat(all_frames, ignore_index=True, sort=False)
    tidy = compute_tidy(combined)

    tidy.sort_values(["year", "geo_type", "NAME"], inplace=True)
    tidy.reset_index(drop=True, inplace=True)

    out = f"{STORAGE_LOCATION}/vt_acs5_b_demographics_tidy.parquet"
    tidy.to_parquet(out, index=False)
    print(f"\nDone. {len(tidy):,} rows -> {out}")


if __name__ == "__main__":
    scrape()
