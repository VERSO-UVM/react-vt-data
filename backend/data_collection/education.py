"""
Fetch ACS 5-Year B15003 educational attainment (population 25+) for Vermont.

Six categories matching the Annual Report:
  No High School Diploma  – B15003_002–016
  High School Graduate    – B15003_017–018 (diploma + GED)
  Some College, No Degree – B15003_019–020
  Associate's Degree      – B15003_021
  Bachelor's Degree       – B15003_022
  Postgraduate Degree     – B15003_023–025

Output: vt_acs5_b_education_tidy.parquet
"""

import pandas as pd

from data_collection.base import ALL_GEOS, VarGroup, run_acs_b_scrape

TOTAL = "B15003_001E"
S = "Educational Attainment"

var_groups = [
    VarGroup(
        "No High School Diploma",
        S,
        [f"B15003_{str(i).zfill(3)}E" for i in range(2, 17)],
        [TOTAL],
    ),
    VarGroup("High School Graduate", S, ["B15003_017E", "B15003_018E"], [TOTAL]),
    VarGroup("Some College, No Degree", S, ["B15003_019E", "B15003_020E"], [TOTAL]),
    VarGroup("Associate's Degree", S, ["B15003_021E"], [TOTAL]),
    VarGroup("Bachelor's Degree", S, ["B15003_022E"], [TOTAL]),
    VarGroup(
        "Postgraduate Degree", S, ["B15003_023E", "B15003_024E", "B15003_025E"], [TOTAL]
    ),
]

fetch_specs = {
    "B15003": [TOTAL] + [f"B15003_{str(i).zfill(3)}E" for i in range(2, 26)],
}

YEARS = range(2009, 2025)


def collect(years: range = YEARS, geos=None, append=False) -> pd.DataFrame:
    if geos is None:
        geos = [(k, *ALL_GEOS[k]) for k in ALL_GEOS]

    frames = []
    for year in years:
        df = run_acs_b_scrape(
            fetch_specs,
            var_groups,
            "vt_acs5_b_education_tidy.parquet",
            year=year,
            geos=geos,
            append=append,
        )
        if df is not None:
            frames.append(df)

    return pd.concat(frames, ignore_index=True) if frames else pd.DataFrame()


if __name__ == "__main__":
    import argparse

    p = argparse.ArgumentParser(description="Scrape ACS B-table education data.")
    p.add_argument("--start-year", type=int, default=2009)
    p.add_argument("--end-year", type=int, default=2024)
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
