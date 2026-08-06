"""
Build script: creates backend/Data/vt_data.duckdb from all source files.

Run from the backend/ directory:
    conda run -n leahy_data python setup_scripts/build_db.py

Tables created
--------------
Timeseries (from CSV):
    unemployment_rate, median_earnings, median_home_value, median_smoc,
    commute_time, commute_habits, historic_population

QCEW (from Parquet):
    qcew

ACS-5 (from Parquet):
    profile_census, b10_census, b15003_education, b_housing, b_economic,
    dp_combined  (materialized union of DP02/03/04/05)

Zoning (from Parquet)

NOTE: to be deprecated once the individual `build.py` scripts are built.
"""

from pathlib import Path

import duckdb

ROOT = Path(__file__).resolve().parent.parent  # backend/
DATA = ROOT / "Data"
DB_PATH = DATA / "vt_data.duckdb"

# SQL snippet that parses Jurisdiction and County out of the NAME column
# (replicates split_name_col regex used elsewhere in the codebase)
_NAME_COLS = """
    regexp_extract(NAME, '^(.*?),', 1)            AS "Jurisdiction",
    regexp_extract(NAME, ',\\s*(.*?) County,', 1) AS "County"
"""


def _csv(name: str) -> str:
    return str(DATA / "Census" / name)


def _acs5(name: str) -> str:
    return str(DATA / "Census" / "ACS_5" / name)


def _zoning(name: str) -> str:
    return str(DATA / "zoning" / name)


def _wastewater(name: str) -> str:
    return str(DATA / "wastewater" / name)


def build() -> None:
    if DB_PATH.exists():
        DB_PATH.unlink()
        print(f"Removed existing {DB_PATH.name}")

    con = duckdb.connect(str(DB_PATH))
    print(f"Building {DB_PATH} ...")

    # ------------------------------------------------------------------
    # Timeseries CSVs — Jurisdiction/County parsed at build time
    # ------------------------------------------------------------------
    con.execute(f"""
        CREATE TABLE unemployment_rate AS
        SELECT
            CAST(year AS VARCHAR) AS year,
            GEOID, NAME, {_NAME_COLS},
            TRY_CAST(Unemployment_Rate AS DOUBLE) AS Unemployment_Rate
        FROM read_csv_auto('{_csv("unemployment_rate_by_year.csv")}')
    """)
    print("  [1/17] unemployment_rate")

    con.execute(f"""
        CREATE TABLE median_earnings AS
        SELECT
            CAST(year AS VARCHAR) AS year,
            GEOID, NAME, {_NAME_COLS},
            variable,
            TRY_CAST(estimate AS DOUBLE) AS estimate
        FROM read_csv_auto('{_csv("median_earnings_by_year.csv")}')
    """)
    print("  [2/17] median_earnings")

    con.execute(f"""
        CREATE TABLE median_home_value AS
        SELECT
            CAST(year AS VARCHAR) AS year,
            GEOID, NAME, {_NAME_COLS},
            TRY_CAST(estimate AS DOUBLE) AS estimate
        FROM read_csv_auto('{_csv("med_home_value_by_year.csv")}')
    """)
    print("  [3/17] median_home_value")

    con.execute(f"""
        CREATE TABLE median_smoc AS
        SELECT
            CAST(year AS VARCHAR) AS year,
            GEOID, NAME, {_NAME_COLS},
            variable,
            TRY_CAST(estimate AS DOUBLE) AS estimate
        FROM read_csv_auto('{_csv("med_smoc_by_year.csv")}')
    """)
    print("  [4/17] median_smoc")

    con.execute(f"""
        CREATE TABLE commute_time AS
        SELECT
            CAST(year AS VARCHAR) AS year,
            GEOID, NAME, {_NAME_COLS},
            TRY_CAST(estimate AS DOUBLE) AS estimate
        FROM read_csv_auto('{_csv("commute_time_by_year.csv")}')
    """)
    print("  [5/17] commute_time")

    con.execute(f"""
        CREATE TABLE commute_habits AS
        SELECT
            CAST(year AS VARCHAR) AS year,
            GEOID, NAME, {_NAME_COLS},
            variable,
            TRY_CAST(estimate AS DOUBLE) AS estimate
        FROM read_csv_auto('{_csv("commute_habits_by_year.csv")}')
    """)
    print("  [6/17] commute_habits")

    con.execute(f"""
        CREATE TABLE historic_population AS
        SELECT
            geoid, NAME, geo_type, {_NAME_COLS},
            CAST("Year" AS VARCHAR) AS "year",
            TRY_CAST(Population AS DOUBLE) AS Population
        FROM read_csv_auto('{_csv("VT_Historic_Population.csv")}')
    """)
    print("  [7/17] historic_population")

    # ------------------------------------------------------------------
    # QCEW
    # ------------------------------------------------------------------
    con.execute(f"""
        CREATE TABLE qcew AS
        SELECT * FROM read_parquet('{DATA / "QCEW" / "vt_qcew_employment.parquet"}')
    """)
    print("  [8/17] qcew")

    # ------------------------------------------------------------------
    # ACS-5 parquets
    # ------------------------------------------------------------------
    con.execute(f"""
        CREATE TABLE profile_census AS
        SELECT * FROM read_parquet('{DATA / "Census" / "vt_acs5_combined_TIDY.parquet"}')
    """)
    print("  [9/17] profile_census")

    con.execute(f"""
        CREATE TABLE b10_census AS
        SELECT * FROM read_parquet('{_acs5("vt_acs5_b_demographics_tidy.parquet")}')
    """)
    print("  [10/17] b10_census")

    con.execute(f"""
        CREATE TABLE b15003_education AS
        SELECT * FROM read_parquet('{_acs5("vt_acs5_b_education_tidy.parquet")}')
    """)
    print("  [11/17] b15003_education")

    con.execute(f"""
        CREATE TABLE b_housing AS
        SELECT * FROM read_parquet('{_acs5("vt_acs5_b_housing_tidy.parquet")}')
    """)
    print("  [12/17] b_housing")

    con.execute(f"""
        CREATE TABLE b_economic AS
        SELECT * FROM read_parquet('{_acs5("vt_acs5_b_economic_tidy.parquet")}')
    """)
    print("  [13/17] b_economic")

    # dp_combined: materialized union of all four DP tables
    con.execute(f"""
        CREATE TABLE dp_combined AS
        SELECT * FROM read_parquet('{_acs5("vt_acs5_Social_data_tidy.parquet")}')
        UNION ALL
        SELECT * FROM read_parquet('{_acs5("vt_acs5_Economic_data_tidy.parquet")}')
        UNION ALL
        SELECT * FROM read_parquet('{_acs5("vt_acs5_Housing_data_tidy.parquet")}')
        UNION ALL
        SELECT * FROM read_parquet('{_acs5("vt_acs5_Demographic_data_tidy.parquet")}')
    """)
    print("  [14/17] dp_combined")

    # ------------------------------------------------------------------
    # Zoning parquet
    # ------------------------------------------------------------------

    con.execute("""
        INSTALL spatial;
        LOAD spatial;
    """)

    con.execute(f"""
        CREATE TABLE zoning AS
        SELECT * FROM read_parquet('{_zoning("vt_zoning.parquet")}')
    """)
    print("  [15/17] zoning")

    # ------------------------------------------------------------------
    # Wastewater parquets
    # ------------------------------------------------------------------

    con.execute("""
        LOAD spatial;
    """)

    con.execute(f"""
        CREATE TABLE ww_treatment_facilities AS
        SELECT * FROM read_parquet('{_wastewater("ww_treatment_facilities.parquet")}')
    """)
    print("  [16/17] WW Treatment Facilities")

    con.execute(f"""
        CREATE TABLE ww_service_areas AS
        SELECT * FROM read_parquet('{_wastewater("ww_service_areas.parquet")}')
    """)
    print("  [17/17] WW Service Areas")

    con.close()
    size_mb = DB_PATH.stat().st_size / 1_048_576
    print(f"\nDone. {DB_PATH} ({size_mb:.1f} MB)")


if __name__ == "__main__":
    build()
