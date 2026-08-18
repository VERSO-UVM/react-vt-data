"""
Fetch ACS 5-Year demographics data for Vermont:
  B01001 – Age by Sex
  B01002 – Median Age
  B02001 – Race
  B03003 – Hispanic or Latino origin

Output: vt_acs5_b_demographics_tidy.parquet
"""

import pandas as pd

from data_collection.base import ALL_GEOS, VarGroup, run_acs_b_scrape

# ---------------------------------------------------------------------------
# Age band definitions: (label, male_suffix_range, female_suffix_range)
# B01001 male age bands: 003-025, female: 027-049
# ---------------------------------------------------------------------------
_AGE_BANDS = [
    ("Under 18", range(3, 7), range(27, 31)),
    ("18 to 24", range(7, 11), range(31, 35)),
    ("25 to 34", range(11, 13), range(35, 37)),
    ("35 to 44", range(13, 15), range(37, 39)),
    ("45 to 54", range(15, 17), range(39, 41)),
    ("55 to 64", range(17, 20), range(41, 44)),
    ("65 to 74", range(20, 23), range(44, 47)),
    ("75 Plus", range(23, 26), range(47, 50)),
]

YEARS = range(2009, 2025)


def _b01001_codes(male_r, female_r):
    return [f"B01001_{str(i).zfill(3)}E" for i in male_r] + [
        f"B01001_{str(i).zfill(3)}E" for i in female_r
    ]


def _all_b01001_vars():
    codes = ["B01001_001E", "B01001_002E", "B01001_026E"]
    for _, m, f in _AGE_BANDS:
        codes += _b01001_codes(m, f)
    return list(dict.fromkeys(codes))


S = "Age/Sex"
var_groups = [
    VarGroup("Population (ACS)", S, ["B01001_001E"], None),
    VarGroup("Male", S, ["B01001_002E"], ["B01001_001E"]),
    VarGroup("Female", S, ["B01001_026E"], ["B01001_001E"]),
    VarGroup("Median Age", S, ["B01002_001E"], None),
    *[
        VarGroup(lbl, S, _b01001_codes(m, f), ["B01001_001E"])
        for lbl, m, f in _AGE_BANDS
    ],
    # Race (B02001)
    VarGroup("White", "Race", ["B02001_002E"], ["B02001_001E"]),
    VarGroup("Black or African American", "Race", ["B02001_003E"], ["B02001_001E"]),
    VarGroup(
        "American Indian and Alaska Native", "Race", ["B02001_004E"], ["B02001_001E"]
    ),
    VarGroup("Asian", "Race", ["B02001_005E"], ["B02001_001E"]),
    VarGroup(
        "Native Hawaiian and Other Pacific Islander",
        "Race",
        ["B02001_006E"],
        ["B02001_001E"],
    ),
    VarGroup("Some other race", "Race", ["B02001_007E"], ["B02001_001E"]),
    VarGroup("Two or more races", "Race", ["B02001_008E"], ["B02001_001E"]),
    # Hispanic (B03003)
    VarGroup(
        "Hispanic or Latino (of any race)", "Hispanic", ["B03003_003E"], ["B03003_001E"]
    ),
]

fetch_specs = {
    "B01001": _all_b01001_vars(),
    "B01002": ["B01002_001E"],
    "B02001": [
        "B02001_001E",
        "B02001_002E",
        "B02001_003E",
        "B02001_004E",
        "B02001_005E",
        "B02001_006E",
        "B02001_007E",
        "B02001_008E",
    ],
    "B03003": ["B03003_001E", "B03003_003E"],
}


def collect(years: range = YEARS, geos=None, append=False) -> pd.DataFrame:
    if geos is None:
        geos = [(k, *ALL_GEOS[k]) for k in ALL_GEOS]

    frames = []
    for year in years:
        df = run_acs_b_scrape(
            fetch_specs,
            var_groups,
            "vt_acs5_b_demographics_tidy.parquet",
            year=year,
            geos=geos,
            append=append,
        )
        if df is not None:
            frames.append(df)

    return pd.concat(frames, ignore_index=True) if frames else pd.DataFrame()


if __name__ == "__main__":
    import argparse

    p = argparse.ArgumentParser(description="Scrape ACS B-table demographics data.")
    p.add_argument("--start-year", type=int, default=2009)
    p.add_argument("--end-year", type=int, default=2024)
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
