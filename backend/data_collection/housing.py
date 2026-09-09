"""
Fetch ACS 5-Year housing data for Vermont:
  B25001 – Total Housing Units
  B25003 – Tenure (owner/renter occupied)
  B25004 – Vacancy Status (for-rent, for-sale)
  B25077 – Median Home Value (owner-occupied)

Variables match Table 4 of the Annual Report:
  Total Housing Units          – B25001_001E          (Value only)
  Median Home Value            – B25077_001E          (Value only)
  Homeowner Vacancy Rate       – for-sale / (owner-occ + for-sale)  (Percent)
  Rental Vacancy Rate          – for-rent / (renter-occ + for-rent) (Percent)
  Renter-Occupied Units        – B25003_003E / B25003_001E          (Value + Percent)

Output: vt_acs5_b_housing_tidy.parquet
"""

from datetime import datetime

import pandas as pd

from data_collection.base import ALL_GEOS, VarGroup, run_acs_b_scrape

S = "Housing"

var_groups = [
    VarGroup("Total Housing Units", S, ["B25001_001E"], None),
    VarGroup("Median Home Value", S, ["B25077_001E"], None),
    # Homeowner vacancy: for-sale vacant / (owner-occupied + for-sale vacant)
    VarGroup(
        "Homeowner Vacancy Rate", S, ["B25004_004E"], ["B25003_002E", "B25004_004E"]
    ),
    # Rental vacancy: for-rent vacant / (renter-occupied + for-rent vacant)
    VarGroup("Rental Vacancy Rate", S, ["B25004_002E"], ["B25003_003E", "B25004_002E"]),
    # Renter-occupied as % of all occupied units
    VarGroup("Renter-Occupied Units", S, ["B25003_003E"], ["B25003_001E"]),
    # Owner-occupied as % of all occupied units
    VarGroup("Owner-Occupied Units", S, ["B25003_002E"], ["B25003_001E"]),
]

fetch_specs = {
    "B25001": ["B25001_001E"],
    "B25003": ["B25003_001E", "B25003_002E", "B25003_003E"],
    "B25004": ["B25004_002E", "B25004_004E"],
    "B25077": ["B25077_001E"],
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
            "vt_acs5_b_housing_tidy.parquet",
            year=year,
            geos=geos,
            append=append,
        )
        if df is not None:
            frames.append(df)

    return pd.concat(frames, ignore_index=True) if frames else pd.DataFrame()


if __name__ == "__main__":
    import argparse

    p = argparse.ArgumentParser(description="Scrape ACS B-table housing data.")
    p.add_argument("--start-year", type=int, default=2009)
    p.add_argument("--end-year", type=int, default=MAX_YEAR - 1)
    p.add_argument(
        "--geos",
        nargs="+",
        choices=list(ALL_GEOS),
        default=list(ALL_GEOS),
        metavar="GEO",
        help=f"Geographies to scrape (default: all). Choices: {list(ALL_GEOS)}",
    )
    p.add_argument(
        "--append",
        action="store_true",
        help="Merge new rows into existing parquet instead of overwriting.",
    )
    args = p.parse_args()
    selected_geos = [(k, *ALL_GEOS[k]) for k in args.geos]

    df = collect(
        years=range(args.start_year, args.end_year + 1),
        geos=selected_geos,
        append=args.append,
    )
