"""
Fetch ACS 5-Year economic data for Vermont:
  B23025 – Employment Status (labor force participation, 16+ and unemployment)
  B23001 – Sex by Age by Employment Status (prime-age 25-54 LFP)
  B19013 – Median Household Income
  B19301 – Per Capita Income

Matches Tables 5, 6, and 7 of the Annual Report.

B23001 prime-age variable codes (structure: 7 vars per age-sex group):
  Male 25-29:  total B23001_024E, in-LF B23001_025E
  Male 30-34:  total B23001_031E, in-LF B23001_032E
  Male 35-44:  total B23001_038E, in-LF B23001_039E
  Male 45-54:  total B23001_045E, in-LF B23001_046E
  Female 25-29: total B23001_110E, in-LF B23001_111E
  Female 30-34: total B23001_117E, in-LF B23001_118E
  Female 35-44: total B23001_124E, in-LF B23001_125E
  Female 45-54: total B23001_131E, in-LF B23001_132E

Output: vt_acs5_b_economic_tidy.parquet
"""

from datetime import datetime

import pandas as pd

from data_collection.base import ALL_GEOS, VarGroup, run_acs_b_scrape

SL = "Labor Force"
SI = "Income"

_PRIME_IN_LF = [
    "B23001_025E",
    "B23001_032E",
    "B23001_039E",
    "B23001_046E",  # male 25-54
    "B23001_111E",
    "B23001_118E",
    "B23001_125E",
    "B23001_132E",  # female 25-54
]

_PRIME_TOTAL = [
    "B23001_024E",
    "B23001_031E",
    "B23001_038E",
    "B23001_045E",  # male 25-54
    "B23001_110E",
    "B23001_117E",
    "B23001_124E",
    "B23001_131E",  # female 25-54
]

var_groups = [
    VarGroup(
        "Labor Force Participation Rate (16+)",
        SL,
        ["B23025_002E"],
        ["B23025_001E"],
    ),
    VarGroup(
        "Unemployment Rate",
        SL,
        ["B23025_005E"],
        ["B23025_003E"],
    ),
    VarGroup(
        "Prime-Age Labor Force Participation Rate (25-54)",
        SL,
        _PRIME_IN_LF,
        _PRIME_TOTAL,
    ),
    VarGroup("Median Household Income", SI, ["B19013_001E"], None),
    VarGroup("Per Capita Income", SI, ["B19301_001E"], None),
]

fetch_specs = {
    "B23025": [
        "B23025_001E",
        "B23025_002E",
        "B23025_003E",
        "B23025_005E",
    ],
    "B23001": _PRIME_TOTAL + _PRIME_IN_LF,
    "B19013": ["B19013_001E"],
    "B19301": ["B19301_001E"],
}

MAX_YEAR = datetime.now().year - 1

YEARS = range(2009, MAX_YEAR)


def collect(years: range = YEARS, geos=None, append=False) -> pd.DataFrame:
    if geos is None:
        geos = [(k, *ALL_GEOS[k]) for k in ALL_GEOS]

    frames = []
    for year in years:
        df = run_acs_b_scrape(
            fetch_specs,
            var_groups,
            "vt_acs5_b_economic_tidy.parquet",
            year=year,
            geos=geos,
            append=append,
        )
        if df is not None:
            frames.append(df)

    return pd.concat(frames, ignore_index=True) if frames else pd.DataFrame()


if __name__ == "__main__":
    import argparse

    p = argparse.ArgumentParser(description="Scrape ACS B-table economic data.")
    p.add_argument("--start-year", type=int, default=2009)
    p.add_argument("--end-year", type=int, default=MAX_YEAR - 1)
    p.add_argument(
        "--geos",
        nargs="+",
        choices=list(ALL_GEOS),
        default=list(ALL_GEOS),
    )
    p.add_argument("--append", action="store_true")

    args = p.parse_args()

    selected_geos = [(k, *ALL_GEOS[k]) for k in args.geos]

    df = collect(
        years=range(args.start_year, args.end_year + 1),
        geos=selected_geos,
        append=args.append,
    )
