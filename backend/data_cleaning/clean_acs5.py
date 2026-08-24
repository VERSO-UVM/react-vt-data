"""
**Author**:
    Ian Sargent
**Created**:
    2026-08-24
**Description**:
    Clean the raw ACS-5 Data Profile (DP) tables from DuckLake and build:
      - Individual cleaned DP tables
      - A combined DP table
      - A county GEOID lookup table

    DP02 – Social
    DP03 – Economic
    DP04 – Housing
    DP05 – Demographic

**Run with**:
    python -m data_cleaning.acs5
"""

import pandas as pd

from lake_build import con

# Data Profile tables
DP_TABLES = {
    "DP02": ("acs5_social", "dp_social"),
    "DP03": ("acs5_economic", "dp_economic"),
    "DP04": ("acs5_housing", "dp_housing"),
    "DP05": ("acs5_demographic", "dp_demographic"),
}

# County GEOIDs for the county_geom table
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


def read_raw_data() -> dict[str, pd.DataFrame]:
    """
    Read the raw ACS-5 DP tables from DuckLake.
    """
    tables = {}

    for dp, (raw_table, _) in DP_TABLES.items():
        tables[dp] = con.execute(
            f"""--sql
            SELECT *
            FROM lake.RAW.{raw_table}
            """
        ).df()

    return tables


def clean_dp_tables(raw_tables: dict[str, pd.DataFrame]) -> dict[str, pd.DataFrame]:
    """
    Clean the individual ACS-5 DP tables.
    """
    cleaned = {}

    for dp, df in raw_tables.items():
        # Future cleaning steps can go in here!
        cleaned[dp] = df

    return cleaned


def build_county_geoids():
    """
    Create the county GEOID table.
    """
    values = ", ".join(f"('{name}', {geoid})" for name, geoid in COUNTY_GEOIDS.items())

    con.execute(
        f"""--sql
        CREATE OR REPLACE TABLE lake.CLEANED.vt_county_geoids AS
        SELECT * FROM (VALUES {values}) AS t(NAME, GEOID)
        """
    )


def add_dp_tables(cleaned: dict[str, pd.DataFrame]):
    """
    Write each DP table to the CLEANED DuckLake schema.
    """
    for dp, df in cleaned.items():
        table = DP_TABLES[dp][1]
        con.execute(
            f"""--sql
            CREATE OR REPLACE TABLE lake.CLEANED.{table} AS
            SELECT *
            FROM df
            """
        )


def build_dp_combined():
    """
    Combine the four DP tables into one table.
    """
    tables = [table_name for _, table_name in DP_TABLES.values()]

    union = "\nUNION ALL\n".join(
        f"SELECT * FROM lake.CLEANED.{table}" for table in tables
    )

    con.execute(
        f"""--sql
        CREATE OR REPLACE TABLE lake.CLEANED.dp_combined AS
        {union}
        """
    )


def clean():
    raw_tables = read_raw_data()
    cleaned = clean_dp_tables(raw_tables)

    add_dp_tables(cleaned)
    build_dp_combined()
    build_county_geoids()


def main():
    clean()


if __name__ == "__main__":
    main()
