"""
Fetch BLS Quarterly Census of Employment and Wages (QCEW) data for Vermont counties.

Downloads quarterly employment by NAICS sector for all 14 VT counties,
computes a four-quarter moving average (4QMA), and saves a tidy parquet.

Data source:
  https://data.bls.gov/cew/data/api/{year}/{quarter}/area/{area_fips}.csv
  (note: quarter is integer 1-4, no 'q' prefix)

Key agglvl_code values (for county area files):
  70 → County, Total Coverage (own_code=0, industry_code=10)
  71 → County by ownership breakdown (own_code=1/2/3/5, industry_code=10)
  74 → County, Private sector by NAICS sector (own_code=5, 2-digit industry codes)

Output: Data/QCEW/vt_qcew_employment.parquet
Columns: County | year | quarter | quarter_label | sector | employment | employment_4qma
"""

import time
from io import StringIO
from pathlib import Path

import pandas as pd
import requests

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

STORAGE_PATH = Path(__file__).resolve().parent.parent / "Data/QCEW"
OUTPUT_FILE = STORAGE_PATH / "vt_qcew_employment.parquet"

# Vermont county FIPS → clean County name
VT_COUNTIES: dict[str, str] = {
    "50001": "Addison",
    "50003": "Bennington",
    "50005": "Caledonia",
    "50007": "Chittenden",
    "50009": "Essex",
    "50011": "Franklin",
    "50013": "Grand Isle",
    "50015": "Lamoille",
    "50017": "Orange",
    "50019": "Orleans",
    "50021": "Rutland",
    "50023": "Washington",
    "50025": "Windham",
    "50027": "Windsor",
}

# 2-digit NAICS industry_code → display sector label
# Private-sector breakdown (agglvl=74, own=5)
SECTOR_MAP: dict[str, str] = {
    "11": "Goods-producing",  # Agriculture, Forestry, Fishing
    "21": "Goods-producing",  # Mining
    "22": "Trade, Transportation & Utilities",  # Utilities
    "23": "Goods-producing",  # Construction
    "31-33": "Goods-producing",  # Manufacturing
    "42": "Trade, Transportation & Utilities",  # Wholesale Trade
    "44-45": "Trade, Transportation & Utilities",  # Retail Trade
    "48-49": "Trade, Transportation & Utilities",  # Transportation & Warehousing
    "51": "Information & Financial Activities",  # Information
    "52": "Information & Financial Activities",  # Finance & Insurance
    "53": "Information & Financial Activities",  # Real Estate
    "54": "Professional & Business Services",  # Professional, Scientific & Tech
    "55": "Professional & Business Services",  # Management of Companies
    "56": "Professional & Business Services",  # Administrative & Support
    "61": "Education & Health Services",  # Educational Services
    "62": "Education & Health Services",  # Health Care & Social Assistance
    "71": "Leisure & Hospitality",  # Arts, Entertainment & Recreation
    "72": "Leisure & Hospitality",  # Accommodation & Food Services
    "81": "Other Services",  # Other Services (excl. Public Admin)
}

# Display order for the stacked chart (bottom → top)
SECTOR_ORDER = [
    "Goods-producing",
    "Trade, Transportation & Utilities",
    "Education & Health Services",
    "Leisure & Hospitality",
    "Professional & Business Services",
    "Information & Financial Activities",
    "Government",
    "Other Services",
]

BASE_URL = "https://data.bls.gov/cew/data/api/{year}/{q}/area/{fips}.csv"
QUARTERS = [1, 2, 3, 4]

YEARS = range(2009, 2025)


# ---------------------------------------------------------------------------
# Fetching
# ---------------------------------------------------------------------------


def fetch_quarter(year: int, quarter: int, area_fips: str) -> pd.DataFrame | None:
    url = BASE_URL.format(year=year, q=quarter, fips=area_fips)
    try:
        r = requests.get(url, timeout=30)
        r.raise_for_status()
        df = pd.read_csv(StringIO(r.text), dtype=str)
        df.columns = df.columns.str.strip()
        return df
    except Exception as e:
        print(f"  SKIP {year}Q{quarter} / {area_fips}: {e}")
        return None


def parse_empl(val: str) -> float:
    """Convert string employment value to float; return NaN on suppressed/missing."""
    try:
        v = float(str(val).strip().replace(",", ""))
        return v if v >= 0 else float("nan")
    except (ValueError, AttributeError):
        return float("nan")


# ---------------------------------------------------------------------------
# Processing
# ---------------------------------------------------------------------------


def process_county(area_fips: str, county_name: str, year: int) -> pd.DataFrame:
    """Fetch all quarters for one county and return long-format DataFrame."""
    rows = []
    for quarter in QUARTERS:
        df = fetch_quarter(year, quarter, area_fips)
        if df is None:
            continue
        time.sleep(0.05)

        df.columns = df.columns.str.strip()
        df["industry_code"] = df["industry_code"].str.strip()
        df["agglvl_code"] = df["agglvl_code"].str.strip()
        df["own_code"] = df["own_code"].str.strip()
        # disclosure_code 'N' means suppressed — treat employment as NaN
        if "disclosure_code" in df.columns:
            suppressed = df["disclosure_code"].str.strip().isin(["N", "ND"])
            for col in ["month1_emplvl", "month2_emplvl", "month3_emplvl"]:
                df[col] = df[col].apply(parse_empl)
                df.loc[suppressed, col] = float("nan")
        else:
            for col in ["month1_emplvl", "month2_emplvl", "month3_emplvl"]:
                df[col] = df[col].apply(parse_empl)
        df["employment"] = df[["month1_emplvl", "month2_emplvl", "month3_emplvl"]].mean(
            axis=1
        )

        base = {
            "County": county_name,
            "year": year,
            "quarter": quarter,
            "quarter_label": f"{year}Q{quarter}",
        }

        # --- Total employment (agglvl=70, own=0, industry=10) ---
        total_row = df[
            (df["agglvl_code"] == "70")
            & (df["own_code"] == "0")
            & (df["industry_code"] == "10")
        ]
        if not total_row.empty:
            rows.append(
                {
                    **base,
                    "sector": "Total",
                    "employment": total_row["employment"].iloc[0],
                }
            )

        # --- Government: federal + state + local (agglvl=71, own=1/2/3, industry=10) ---
        gov_rows = df[
            (df["agglvl_code"] == "71")
            & (df["own_code"].isin(["1", "2", "3"]))
            & (df["industry_code"] == "10")
        ]
        if not gov_rows.empty:
            gov_empl = gov_rows["employment"].sum()
            rows.append({**base, "sector": "Government", "employment": gov_empl})

        # --- Private sector NAICS sectors (agglvl=74, own=5) ---
        private_rows = df[(df["agglvl_code"] == "74") & (df["own_code"] == "5")]
        for _, row in private_rows.iterrows():
            code = row["industry_code"]
            sector = SECTOR_MAP.get(code)
            if sector is None:
                continue
            rows.append({**base, "sector": sector, "employment": row["employment"]})

    if not rows:
        return pd.DataFrame()

    df_out = pd.DataFrame(rows)

    # Sum sub-sectors that share the same sector label (e.g. multiple NAICS → "Goods-producing")
    # min_count=1 preserves NaN when ALL sub-sectors are suppressed (not just some)
    df_out = df_out.groupby(
        ["County", "year", "quarter", "quarter_label", "sector"], as_index=False
    )["employment"].sum(min_count=1)
    df_out.sort_values(["sector", "year", "quarter"], inplace=True)
    df_out.reset_index(drop=True, inplace=True)

    # 4-quarter moving average per sector; forward-fill to bridge suppression gaps
    df_out["employment_4qma"] = df_out.groupby(["County", "sector"])[
        "employment"
    ].transform(lambda s: s.rolling(4, min_periods=1).mean().ffill().round(0))

    return df_out


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------


def run_qcew_scrape(years: range = YEARS) -> pd.DataFrame:
    STORAGE_PATH.mkdir(parents=True, exist_ok=True)
    all_frames = []
    for year in years:
        for fips, name in VT_COUNTIES.items():
            print(f"\n=== {name} County ({fips}) ===")
            df = process_county(fips, name, year)
            if not df.empty:
                all_frames.append(df)
            else:
                print("No data")

    if not all_frames:
        print("No data fetched.")
        return pd.DataFrame()

    combined = pd.concat(all_frames, ignore_index=True)
    combined.sort_values(["County", "year", "quarter", "sector"], inplace=True)
    combined.reset_index(drop=True, inplace=True)

    return combined


def collect(years: range = YEARS):
    df = run_qcew_scrape(years)
    return df


if __name__ == "__main__":
    df = collect()
