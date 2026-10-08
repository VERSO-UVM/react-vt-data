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
from data_collection.parallel import pmap
from query.clock import EASTERN_STD_TIME

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


MAX_YEAR = datetime.now(EASTERN_STD_TIME).year - 2

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
    except Exception as e:  # noqa: BLE001 -- skip and keep the run going
        print(f"  SKIP {year} / {for_clause}: {e}")
        return None


# ---------------------------------------------------------------------------
# Tidy computation
# ---------------------------------------------------------------------------


def pct(val: float, total: float) -> float | None:
    try:
        if total and total > 0:
            return round((val / total) * 100, 1)
    except OverflowError:
        print(f"OverflowError computing pct({val}, {total})")
    except FloatingPointError:
        print(f"FloatingPointError computing pct({val}, {total})")
    except ValueError:
        print(f"ValueError computing pct({val}, {total})")
    return None


def compute_tidy_generic(df: pd.DataFrame, var_groups: list[VarGroup]) -> pd.DataFrame:
    base = pd.DataFrame(
        {
            "year": df["year"],
            "geo_type": df["geo_type"],
            "NAME": df["NAME"],
            "state": df.get("state"),
            "county": df.get("county"),
        }
    )

    def row_sum(codes: list[str]) -> pd.Series:
        # reindex: codes absent from df become all-NaN columns, then count as 0
        return df.reindex(columns=codes).fillna(0).sum(axis=1)

    frames = []
    for var in var_groups:
        value = row_sum(var.codes)
        if var.denom:
            denom = row_sum(var.denom)
            percent = (value / denom * 100).round(1).where(denom > 0)
        else:
            percent = None
        frames.append(
            base.assign(
                Section=var.section, Variable=var.label, Value=value, Percent=percent
            )
        )
    if not frames:
        return pd.DataFrame()

    return pd.concat(frames).sort_index(kind="stable").reset_index(drop=True)


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
    print(f"\n=== {year} ===")

    def fetch_geo(geo):
        geo_label, for_clause, in_clause = geo
        merged = None
        for table_name, codes in fetch_specs.items():
            print(f"  {year} / {table_name} / {geo_label}...")
            df = fetch(year, codes, for_clause, in_clause)
            if df is None:
                return None
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
        time.sleep(0.01)
        return merged

    all_frames = [m for m in pmap(fetch_geo, geos) if m is not None]

    if not all_frames:
        print("No data fetched.")
        return pd.DataFrame()

    combined = pd.concat(all_frames, ignore_index=True, sort=False)
    tidy = compute_tidy_generic(combined, var_groups)
    tidy.sort_values(["year", "geo_type", "NAME"], inplace=True)
    tidy = split_name_col(tidy)  # keeps NAME and adds Jurisdiction + County columns
    tidy.reset_index(drop=True, inplace=True)

    return tidy
