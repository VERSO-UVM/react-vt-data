"""
Shared utilities for ACS 5-Year Census B-table scrapers.

Each scraper defines:
  fetch_specs  – dict mapping Census table name → list of variable codes.
                 Each entry triggers one API call; results are merged by geography.
  var_groups   – list of VarGroup, describing how raw columns become tidy output rows.

Then calls run_scrape(fetch_specs, var_groups, output_filename).

Geography selection
-------------------
ALL_GEOS maps a short key to (for_clause, in_clause) for the Census API.
Pass a subset to run_scrape(geos=...) or use --geos on the CLI to scrape
only specific geographic levels.

Append mode
-----------
run_scrape(..., append=True) reads the existing parquet, drops any rows
whose NAME appears in the newly fetched data (so a re-run of state/national
replaces rather than duplicates those rows), then writes the merged result.
"""

import time
from dataclasses import dataclass

import pandas as pd
import requests

from app_utils.census import split_name_col

API_KEY = "29af5488bbdb8c7d9f67b7f4ff9c9151e8c2bd0a"
BASE_URL = "https://api.census.gov/data/{year}/acs/acs5"
STATE_FIPS = "50"
YEARS = list(range(2009, 2025))
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
    output_filename: str,
    years: list[int] = YEARS,
    geos: list = GEOS,
    append: bool = False,
) -> None:
    """
    Fetch Census data, compute tidy rows, and save as parquet.

    fetch_specs:      maps a Census table label (for logging) to its variable codes.
                      Each entry triggers a separate API call; all are merged by geo.
    var_groups:       defines how raw fetched columns assemble into tidy output rows.
    output_filename:  file name (not path) saved under STORAGE_LOCATION.
    geos:             list of (label, for_clause, in_clause) tuples to scrape.
    append:           if True, merge with existing parquet instead of overwriting.
                      Rows whose NAME appears in the new data replace old rows.
    """
    all_frames = []

    for year in years:
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
            time.sleep(0.1)

    if not all_frames:
        print("No data fetched.")
        return

    combined = pd.concat(all_frames, ignore_index=True, sort=False)
    tidy = compute_tidy_generic(combined, var_groups)
    tidy.sort_values(["year", "geo_type", "NAME"], inplace=True)
    tidy = split_name_col(tidy)  # keeps NAME and adds Jurisdiction + County
    tidy.reset_index(drop=True, inplace=True)

    out = f"{STORAGE_LOCATION}/{output_filename}"

    if append:
        try:
            existing = pd.read_parquet(out)
            # Drop any existing rows for the NAMEs we just fetched, then concat
            new_names = set(tidy["NAME"].unique())
            existing = existing[~existing["NAME"].isin(new_names)]
            tidy = pd.concat([existing, tidy], ignore_index=True)
            tidy.sort_values(["year", "geo_type", "NAME"], inplace=True)
            tidy.reset_index(drop=True, inplace=True)
            print(
                f"Appended — kept {len(existing):,} existing rows, "
                f"added/replaced {len(new_names)} NAME(s)."
            )
        except FileNotFoundError:
            print(f"No existing file at {out}; writing fresh.")

    # tidy.to_parquet(out, index=False)
    # print(f"\nDone. {len(tidy):,} rows -> {out}")

    return tidy
