import duckdb

DP_TABLES = {
    "DP02": ("acs5_social", "dp_social"),
    "DP03": ("acs5_economic", "dp_economic"),
    "DP04": ("acs5_housing", "dp_housing"),
    "DP05": ("acs5_demographic", "dp_demographic"),
}

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


def add_dp_tables(con: duckdb.DuckDBPyConnection):
    """
    Write each RAW DP table to CLEANED and add the DP identifier.
    """

    for dp, (raw_table, cleaned_table) in DP_TABLES.items():
        con.execute(
            f"""
            CREATE OR REPLACE TABLE lake.CLEANED.{cleaned_table} AS
            SELECT
                *,
                '{dp}' AS "table"
            FROM lake.RAW.{raw_table}
            """
        )


def build_dp_combined(con: duckdb.DuckDBPyConnection):
    unions = []

    for dp, (raw_table, _) in DP_TABLES.items():
        unions.append(
            f"""
            SELECT
                NAME,
                '{dp}' AS "table",
                Category,
                Subcategory,
                Variable,
                Measure,
                year,
                Value
            FROM lake.RAW.{raw_table}
            """
        )

    con.execute(
        f"""
        CREATE OR REPLACE TABLE
            lake.CLEANED.acs5_dp_combined_tidy
        AS
        {" UNION ALL ".join(unions)}
        """
    )


def build_county_geoids(con: duckdb.DuckDBPyConnection):
    """
    Create the county GEOID lookup table.
    """

    values = ", ".join(f"('{name}', {geoid})" for name, geoid in COUNTY_GEOIDS.items())

    con.execute(
        f"""
        CREATE OR REPLACE TABLE lake.CLEANED.vt_county_geoids AS
        SELECT *
        FROM (
            VALUES {values}
        ) AS t(NAME, GEOID)
        """
    )


def clean(con: duckdb.DuckDBPyConnection):
    add_dp_tables(con)
    build_dp_combined(con)
    build_county_geoids(con)


def main(con: duckdb.DuckDBPyConnection):
    clean(con)


if __name__ == "__main__":
    from lake_build import get_connection

    con = get_connection()

    try:
        main(con)
    finally:
        con.close()
