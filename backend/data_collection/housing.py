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

from backend.data_collection.census_base import GEOS, YEARS, VarGroup, run_scrape

S = "Housing"

var_groups = [
    VarGroup("Total Housing Units", S, ["B25001_001E"], None),
    VarGroup("Median Home Value", S, ["B25077_001E"], None),
    # Homeowner vacancy: for-sale vacant / (owner-occupied + for-sale vacant)
    VarGroup(
        "Homeowner Vacancy Rate", S, ["B25004_004E"], [
            "B25003_002E", "B25004_004E"]
    ),
    # Rental vacancy: for-rent vacant / (renter-occupied + for-rent vacant)
    VarGroup("Rental Vacancy Rate", S, ["B25004_002E"], [
             "B25003_003E", "B25004_002E"]),
    # Renter-occupied as % of all occupied units
    VarGroup("Renter-Occupied Units", S, ["B25003_003E"], ["B25003_001E"]),
]

fetch_specs = {
    "B25001": ["B25001_001E"],
    "B25003": ["B25003_001E", "B25003_002E", "B25003_003E"],
    "B25004": ["B25004_002E", "B25004_004E"],
    "B25077": ["B25077_001E"],
}

if __name__ == "__main__":
    import argparse

    from data_collection.base import ALL_GEOS

    p = argparse.ArgumentParser(description="Scrape ACS B-table housing data.")
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
    run_scrape(
        fetch_specs,
        var_groups,
        "vt_acs5_b_housing_tidy.parquet",
        YEARS,
        selected_geos,
        append=args.append,
    )
