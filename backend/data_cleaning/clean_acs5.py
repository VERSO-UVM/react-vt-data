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


def _dp_select_sql(dp: str, raw_table: str) -> str:
    """
    Build the SELECT for a single DP table, joined against `vt_town_lines`
    to attach a `geoid` (town GEOID, county FIPS, or state FIPS depending on
    `geo_type`). `county_fips` (the geoid's first 5 characters) is only
    populated for county- and town-level rows.
    """

    return f"""--sql
        SELECT
            g.year,
            g.name,
            CASE
                WHEN g.geo_type IN ('county', 'town') THEN LEFT(g.geoid, 5)
            END AS county_fips,
            g.category,
            g.subcategory,
            g.variable,
            g.measure,
            g.value,
            g."table",
            g.geo_type,
            g.geoid
        FROM (
            SELECT
                n.year,
                n.NAME AS name,
                n.Category AS category,
                n.Subcategory AS subcategory,
                n.Variable AS variable,
                n.Measure AS measure,
                n.Value AS value,
                '{dp}' AS "table",
                n.geo_type_norm AS geo_type,
                CASE
                    WHEN n.geo_type_norm = 'town' THEN t.GEOID
                    WHEN n.geo_type_norm = 'county' THEN CONCAT(n.state, n.county)
                    WHEN n.geo_type_norm = 'state' THEN '50'
                END AS geoid
            FROM (
                SELECT
                    r.*,
                    CASE
                        WHEN r.geo_type = 'county_subdivision' THEN 'town'
                        ELSE r.geo_type
                    END AS geo_type_norm
                FROM lake.RAW.{raw_table} AS r
            ) AS n
            LEFT JOIN lake.RAW.vt_town_lines AS t
                ON n.NAME = t.NAME
        ) AS g
        """


def add_dp_tables(con: duckdb.DuckDBPyConnection):
    """
    Write each RAW DP table to CLEANED and add the DP identifier.
    """

    for dp, (raw_table, cleaned_table) in DP_TABLES.items():
        con.execute(
            f"""--sql
            CREATE OR REPLACE TABLE lake.CLEANED.{cleaned_table} AS
            {_dp_select_sql(dp, raw_table)}
            """
        )


def build_dp_combined(con: duckdb.DuckDBPyConnection):
    unions = [_dp_select_sql(dp, raw_table) for dp, (raw_table, _) in DP_TABLES.items()]

    con.execute(
        f"""--sql
        CREATE OR REPLACE TABLE lake.CLEANED.acs5_dp_combined_tidy AS
        {" UNION ALL ".join(unions)}
        """
    )


def build_county_geoids(con: duckdb.DuckDBPyConnection):
    """
    Create the county GEOID lookup table.
    """

    values = ", ".join(f"('{name}', {geoid})" for name, geoid in COUNTY_GEOIDS.items())

    con.execute(
        f"""--sql
        CREATE OR REPLACE TABLE lake.CLEANED.vt_county_geoids AS
        SELECT *
        FROM (
            VALUES {values}
        ) AS t(name, geoid)
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
