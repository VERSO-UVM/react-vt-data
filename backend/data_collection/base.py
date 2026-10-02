"""
Shared utilities for ACS 5-Year Census B-table scrapers.
"""

import os
import time
from dataclasses import dataclass
from datetime import datetime

import pandas as pd
import requests

from data_collection.census import split_name_col

# Define API key through the .env file
API_KEY = os.environ.get("CENSUS_API_KEY")
BASE_URL = "https://api.census.gov/data/{year}/acs/acs5"
STATE_FIPS = "50"
STORAGE_LOCATION = "Data/Census/ACS_5"

# ---------------------------------------------------------------------------
# Geography registry
# ---------------------------------------------------------------------------

ALL_GEOS: dict[str, tuple[str, str]] = {
    "county": ("county:*", f"state:{STATE_FIPS}"),
    "county_subdivision": ("county subdivision:*", f"state:{STATE_FIPS}"),
    "state": (f"state:{STATE_FIPS}", ""),  # Vermont statewide → NAME = "Vermont"
    "national": ("us:1", ""),  # US overall       → NAME = "United States"
}

# Default: all geographies (preserves original scrape order)
GEOS = [(k, *v) for k, v in ALL_GEOS.items()]


MAX_YEAR = datetime.now().year - 2

# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------


@dataclass
class VarGroup:
    """
    Defines one output row in the tidy dataset per geography/year.

    label:   display name (the Variable column).
    section: category label (the Section column).
    codes:   Census variable codes to SUM for the Value.
    denom:   codes to SUM for the percent denominator; None → Percent is null.
    """

    label: str
    section: str
    codes: list[str]
    denom: list[str] | None = None


# ---------------------------------------------------------------------------
# Census API fetch
# ---------------------------------------------------------------------------


def fetch(
    year: int, variables: list[str], for_clause: str, in_clause: str
) -> pd.DataFrame | None:
    params = {
        "get": ",".join(variables) + ",NAME",
        "for": for_clause,
        "key": API_KEY,
    }
    if params.get("key") is None:
        print("API key is either missing or set to None.")
        return None

    if in_clause:  # state/national geos have no "in" clause
        params["in"] = in_clause

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


# ---------------------------------------------------------------------------
# Tidy computation
# ---------------------------------------------------------------------------


def pct(val: float, total: float) -> float | None:
    try:
        if total and total > 0:
            return round(val / total * 100, 1)
    except Exception:
        pass
    return None


def compute_tidy_generic(df: pd.DataFrame, var_groups: list[VarGroup]) -> pd.DataFrame:
    rows = []
    for _, row in df.iterrows():
        base = {
            "year": row["year"],
            "geo_type": row["geo_type"],
            "NAME": row["NAME"],
            "state": row.get("state"),
            "county": row.get("county"),
        }
        for g in var_groups:
            value = sum(row.get(c) or 0 for c in g.codes)
            denom = sum(row.get(c) or 0 for c in g.denom) if g.denom else None
            rows.append(
                {
                    **base,
                    "Section": g.section,
                    "Variable": g.label,
                    "Value": value,
                    "Percent": pct(value, denom),
                }
            )
    return pd.DataFrame(rows)


# ---------------------------------------------------------------------------
# Main scrape runner
# ---------------------------------------------------------------------------


def run_acs_b_scrape(
    fetch_specs: dict[str, list[str]],
    var_groups: list[VarGroup],
    year: int = MAX_YEAR,
    geos: list = GEOS,
) -> pd.DataFrame:
    """
    Fetch Census data, compute tidy rows, and return tidy DataFrame.

    Args:
        fetch_specs: dict of {table_name: list of variable codes to fetch}
        var_groups: list of VarGroup objects defining tidy output rows
        year: year to fetch (default = MAX_YEAR)
        geos: list of geographies to fetch (default = GEOS)

    Returns:
        pd.DataFrame: tidy DataFrame of the fetched data
    """
    all_frames = []

    print(f"\n=== {year} ===")
    for geo_label, for_clause, in_clause in geos:
        merged = None
        failed = False
        for table_name, codes in fetch_specs.items():
            print(f"  {table_name} / {geo_label}...")
            df = fetch(year, codes, for_clause, in_clause)
            if df is None:
                failed = True
                break
            if merged is None:
                merged = df.copy()
                merged["geo_type"] = geo_label
            else:
                # Build merge key from whichever ID columns are present
                merge_cols = ["NAME"]
                for col in ("state", "county"):
                    if col in merged.columns and col in df.columns:
                        merge_cols.append(col)
                new_var_cols = [c for c in df.columns if c.startswith("B")]
                merged = merged.merge(
                    df[merge_cols + new_var_cols], on=merge_cols, how="left"
                )
        if not failed and merged is not None:
            all_frames.append(merged)
        time.sleep(0.01)

    if not all_frames:
        print("No data fetched.")
        return pd.DataFrame()

    combined = pd.concat(all_frames, ignore_index=True, sort=False)
    tidy = compute_tidy_generic(combined, var_groups)
    tidy.sort_values(["year", "geo_type", "NAME"], inplace=True)
    tidy = split_name_col(tidy)  # keeps NAME and adds Jurisdiction + County columns
    tidy.reset_index(drop=True, inplace=True)

    return tidy
