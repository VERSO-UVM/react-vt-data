"""
Fetch ACS 5-year poverty and health-insurance context for every Vermont
census tract (experimental: pairs with CDC PLACES tracts on the relationship
map, e.g. poverty vs. health across Addison County's tracts).

Tables:
  B17001 – Poverty status in the past 12 months
  C27016 – Health insurance coverage by ratio of income to poverty level,
           by age (a published cross-tab: insurance *within* poverty groups)

Years start in 2020, the first ACS 5-year release on 2020 census tracts,
which are the tracts CDC PLACES and vt_tract_lines use.

Output (RAW.acs5_tract): one row per tract, year and variable code with the
raw estimate and margin of error, Census sentinels (negative codes) left as
is so the cleaner can treat them as missing rather than as values.
"""

import os
import time
from datetime import UTC, datetime

import pandas as pd
import requests

API_KEY = os.environ.get("CENSUS_API_KEY")
BASE_URL = "https://api.census.gov/data/{year}/acs/acs5"
STATE_FIPS = "50"
TABLES = ["B17001", "C27016"]

MAX_YEAR = datetime.now(UTC).year - 2
YEARS = range(2020, MAX_YEAR + 1)


def fetch_table(year: int, table: str) -> pd.DataFrame:
    """Every Vermont tract's estimates and margins of error for one table,
    long: year, NAME, state, county, tract, code, estimate, moe."""
    params = {
        # group() already includes NAME and GEO_ID.
        "get": f"group({table})",
        "for": "tract:*",
        "in": f"state:{STATE_FIPS}",
        "key": API_KEY,
    }
    r = requests.get(BASE_URL.format(year=year), params=params, timeout=60)
    r.raise_for_status()
    if "json" not in r.headers.get("content-type", ""):
        # Missing or invalid keys redirect to an HTML page.
        raise RuntimeError(f"Census API returned no data ({r.url.split('?')[0]})")
    header, *rows = r.json()
    wide = pd.DataFrame(rows, columns=header)
    return to_long(wide, table, year)


def to_long(wide: pd.DataFrame, table: str, year: int) -> pd.DataFrame:
    """Reshape a group() response to one row per tract and variable code."""
    wide = wide.loc[:, ~wide.columns.duplicated()]
    ids = ["NAME", "state", "county", "tract"]
    codes = sorted(
        {c[:-1] for c in wide.columns if c.startswith(f"{table}_") and c[-1] == "E"}
    )
    frames = [
        pd.DataFrame(
            {
                **{k: wide[k] for k in ids},
                "code": code,
                "estimate": pd.to_numeric(wide[f"{code}E"], errors="coerce"),
                "moe": pd.to_numeric(wide.get(f"{code}M"), errors="coerce"),
            }
        )
        for code in codes
    ]
    long = pd.concat(frames, ignore_index=True)
    long.insert(0, "year", year)
    return long


def collect(years: range = YEARS) -> pd.DataFrame:
    frames = []
    for year in years:
        if year < 2020:
            # No data on 2020 census tracts before the 2020 ACS 5-year release.
            continue
        for table in TABLES:
            print(f"  {table} / tracts / {year}...")
            frames.append(fetch_table(year, table))
            time.sleep(0.1)
    return pd.concat(frames, ignore_index=True)
