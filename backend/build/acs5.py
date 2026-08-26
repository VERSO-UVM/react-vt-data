"""
**Author**:
    Ian Sargent
**Created**:
    2026-06-15
**Description**:
    Build script for the Census ACS-5 tables and the census-derived by-year
    timeseries. Loads the tidy ACS parquets, reads the raw by-year CSVs, derives
    county/statewide rollups for the unemployment and earnings series, and
    writes every table to Data/_Processed/acs5/. Absorbed the old build_db.py,
    so the QCEW passthrough lands here too (under Data/_Processed/qcew/).
"""

from build import BACKEND, CON, data_dir

proc_dir = BACKEND / "Data" / "_Processed" / "acs5"
qcew_dir = BACKEND / "Data" / "_Processed" / "qcew"
census_dir = data_dir / "Census"
acs5_dir = census_dir / "ACS_5"

# SQL snippet that parses Jurisdiction and County out of the NAME column
# (replicates the split_name_col regex used elsewhere in the codebase)
NAME_COLS = """
    regexp_extract(NAME, '^(.*?),', 1)            AS "Jurisdiction",
    regexp_extract(NAME, ',\\s*(.*?) County,', 1) AS "County"
"""

# hardcoded specifics:
# Every tidy ACS parquet, mapped to the table name it is served under. The
# scrapers in data_collection/ write the sources; nothing else under ACS_5 is
# used, and load_tidy() raises if a new tidy file shows up unmapped.
TIDY_TABLES = {
    "vt_acs5_b01001_tidy": "b01001",
    "vt_acs5_b_demographics_tidy": "b10_census",
    "vt_acs5_b_education_tidy": "b15003_education",
    "vt_acs5_b_housing_tidy": "b_housing",
    "vt_acs5_b_economic_tidy": "b_economic",
    "vt_acs5_Social_data_tidy": "dp_social",
    "vt_acs5_Economic_data_tidy": "dp_economic",
    "vt_acs5_Housing_data_tidy": "dp_housing",
    "vt_acs5_Demographic_data_tidy": "dp_demographic",
}

# The four data-profile tables above, materialized as one long table.
DP_PARTS = ["dp_social", "dp_economic", "dp_housing", "dp_demographic"]

# By-year CSVs that need no rollups: table -> (file, measure columns)
TIMESERIES_SOURCES = {
    "median_home_value": (
        "med_home_value_by_year.csv",
        "TRY_CAST(estimate AS DOUBLE) AS estimate",
    ),
    "median_smoc": (
        "med_smoc_by_year.csv",
        "variable, TRY_CAST(estimate AS DOUBLE) AS estimate",
    ),
    "commute_time": (
        "commute_time_by_year.csv",
        "TRY_CAST(estimate AS DOUBLE) AS estimate",
    ),
    "commute_habits": (
        "commute_habits_by_year.csv",
        "variable, TRY_CAST(estimate AS DOUBLE) AS estimate",
    ),
}

# County FIPS codes, used to label the rollups derived from town-level rows.
COUNTY_GEOIDS = {
    "Addison County, Vermont": 50001,
    "Bennington County, Vermont": 50003,
    "Caledonia County, Vermont": 50005,
    "Chittenden County, Vermont": 50007,
    "Essex County, Vermont": 50009,
    "Franklin County, Vermont": 50011,
    "Grand Isle County, Vermont": 50013,
    "Lamoille County, Vermont": 50015,
    "Orange County, Vermont": 50017,
    "Orleans County, Vermont": 50019,
    "Rutland County, Vermont": 50021,
    "Washington County, Vermont": 50023,
    "Windham County, Vermont": 50025,
    "Windsor County, Vermont": 50027,
}

TABLES = [
    *TIDY_TABLES.values(),
    "profile_census",
    "dp_combined",
    *TIMESERIES_SOURCES,
    "historic_population",
    "unemployment_rate",
    "median_earnings",
]

# NOTE: _Processed/acs5/snapshot.parquet has no upstream file under Data/ — it
# was committed directly. main() leaves it in place rather than clobbering it.


# functions:
def load_tidy():
    """Register each tidy ACS parquet under its served table name."""
    found = {path.stem for path in acs5_dir.glob("*_tidy.parquet")}
    unmapped = found - TIDY_TABLES.keys()
    if unmapped:
        raise ValueError(f"unmapped tidy parquets in {acs5_dir}: {sorted(unmapped)}")

    for stem, table in TIDY_TABLES.items():
        CON.execute(f"""--sql
            CREATE OR REPLACE TABLE {table} AS
            SELECT * FROM read_parquet('{acs5_dir / f"{stem}.parquet"}')
        """)


def build_profile_census():
    path = census_dir / "vt_acs5_combined_TIDY.parquet"
    CON.execute(f"""--sql
        CREATE OR REPLACE TABLE profile_census AS
        SELECT * FROM read_parquet('{path}')
    """)


def build_dp_combined():
    union = "\nUNION ALL\n".join(f"SELECT * FROM {part}" for part in DP_PARTS)
    CON.execute(f"""--sql
        CREATE OR REPLACE TABLE dp_combined AS
        {union}
    """)


def build_county_geoids():
    """
    County GEOIDs table
    """
    values = ", ".join(f"('{name}', {geoid})" for name, geoid in COUNTY_GEOIDS.items())
    CON.execute(f"""--sql
        CREATE OR REPLACE TABLE county_geoids AS
        SELECT * FROM (VALUES {values}) AS t(NAME, GEOID)
    """)


def build_timeseries():
    for table, (filename, measures) in TIMESERIES_SOURCES.items():
        CON.execute(f"""--sql
            CREATE OR REPLACE TABLE {table} AS
            SELECT
                CAST(year AS VARCHAR) AS year,
                GEOID, NAME, {NAME_COLS},
                {measures}
            FROM read_csv_auto('{census_dir / filename}')
        """)


def build_historic_population():
    path = census_dir / "VT_Historic_Population.csv"
    CON.execute(f"""--sql
        CREATE OR REPLACE TABLE historic_population AS
        SELECT
            geoid, NAME, geo_type, {NAME_COLS},
            CAST("Year" AS VARCHAR) AS "year",
            TRY_CAST(Population AS DOUBLE) AS Population
        FROM read_csv_auto('{path}')
    """)


def build_rollup_series(table: str, filename: str, variable: str, value_col: str):
    """Town-level series plus the county and statewide averages derived from it.

    The by-year CSVs only cover county subdivisions, so a county row is the mean
    across that county's towns and the state row is the mean across counties.
    """
    path = census_dir / filename
    CON.execute(f"""--sql
        CREATE OR REPLACE TABLE {table} AS
        WITH base AS (
            SELECT
                CAST(year AS VARCHAR) AS year,
                GEOID, NAME, {NAME_COLS},
                {variable} AS "Variable",
                TRY_CAST({value_col} AS DOUBLE) AS "Value",
                'county_subdivision' AS geotype
            FROM read_csv_auto('{path}')
        ),
        county AS (
            SELECT
                base.year,
                g.GEOID,
                g.NAME,
                CAST(NULL AS VARCHAR) AS "Jurisdiction",
                CAST(NULL AS VARCHAR) AS "County",
                base."Variable",
                avg(base."Value") AS "Value",
                'county' AS geotype
            FROM base
            INNER JOIN county_geoids AS g
                ON g.NAME = base."County" || ' County, Vermont'
            WHERE regexp_matches(base.NAME, 'town|city|village|gore', 'i')
            GROUP BY base.year, g.GEOID, g.NAME, base."Variable"
        ),
        state AS (
            SELECT
                year,
                50 AS GEOID,
                'Vermont' AS NAME,
                CAST(NULL AS VARCHAR) AS "Jurisdiction",
                CAST(NULL AS VARCHAR) AS "County",
                "Variable",
                avg("Value") AS "Value",
                'state' AS geotype
            FROM county
            GROUP BY year, "Variable"
        )
        SELECT * FROM base
        UNION ALL
        SELECT * FROM county
        UNION ALL
        SELECT * FROM state
    """)


def build_qcew():
    path = data_dir / "QCEW" / "vt_qcew_employment.parquet"
    CON.execute(f"""--sql
        CREATE OR REPLACE TABLE qcew AS
        SELECT * FROM read_parquet('{path}')
    """)


def main():
    load_tidy()
    build_profile_census()
    build_dp_combined()
    build_county_geoids()
    build_timeseries()
    build_historic_population()
    build_rollup_series(
        "unemployment_rate",
        "unemployment_rate_by_year.csv",
        variable="'Unemployment Rate'",
        value_col="Unemployment_Rate",
    )
    build_rollup_series(
        "median_earnings",
        "median_earnings_by_year.csv",
        variable="variable",
        value_col="estimate",
    )
    build_qcew()

    proc_dir.mkdir(parents=True, exist_ok=True)
    for table in TABLES:
        CON.execute(
            f"""COPY (SELECT * FROM {table}) TO '{proc_dir / f"{table}.parquet"}'
            (FORMAT PARQUET)
            """
        )

    # QCEW is not ACS data, so it gets its own folder — processed_db derives the
    # table name `qcew_employment` from the path.
    qcew_dir.mkdir(parents=True, exist_ok=True)
    CON.execute(
        f"""COPY (SELECT * FROM qcew) TO '{qcew_dir / "employment.parquet"}'
        (FORMAT PARQUET)
        """
    )


if __name__ == "__main__":
    main()
