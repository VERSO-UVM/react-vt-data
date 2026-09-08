"""
**Author**:
    Ian Sargent
**Created**:
    2026-07-16
**Description**:
    Data cleaning script for the raw boundary line tables in the DuckLake.

    Standardizes boundary column names to match the legacy processed boundary
    tables used throughout the application.

    County:
        CountyFIPS
        CountyName
        geom

    Town:
        FIPS_ID
        TOWN_NAME
        geometry

    Tract:
        LocationID
        name
        geometry

Run with:
    python -m data_cleaning.clean_boundaries
"""

import duckdb


## BUILD CLEANED VIEWS --------------------
def build_county_lines(con: duckdb.DuckDBPyConnection) -> None:
    """
    Clean VT county boundary lines.

    Standardizes county identifiers and names to the legacy boundary
    column conventions:
        CNTYGEOID -> CountyFIPS
        CNTYNAME  -> CountyName
        geometry      -> geom
    """
    con.execute(
        """--sql
        CREATE OR REPLACE VIEW vt_county_lines AS
        SELECT
            CNTYGEOID AS CountyFIPS,
            CNTYNAME AS CountyName,
            geometry
        FROM lake.RAW.vt_county_lines
        """
    )


def build_town_lines(con: duckdb.DuckDBPyConnection) -> None:
    """
    Clean VT town boundary lines.

    Standardizes town identifiers and names to the legacy boundary
    column conventions:
        GEOID -> FIPS_ID
        NAME  -> TOWN_NAME
        geom  -> geometry
    """
    con.execute(
        """--sql
        CREATE OR REPLACE VIEW vt_town_lines AS
        SELECT
            GEOID AS FIPS_ID,
            TRIM(SPLIT_PART("NAME", ',', 1)) AS TOWN_NAME,
            geometry
        FROM lake.RAW.vt_town_lines
        """
    )


def build_tract_lines(con: duckdb.DuckDBPyConnection) -> None:
    """
    Clean VT Census tract boundary lines.

    Standardizes the tract identifier to LocationID.
    """
    con.execute(
        """--sql
        CREATE OR REPLACE VIEW vt_tract_lines AS
        SELECT
            GEOID AS LocationID,
            NAMELSAD AS name,
            geometry
        FROM lake.RAW.vt_tract_lines
        """
    )


## WRITE CLEANED TABLES --------------------
def add_to_lake(con: duckdb.DuckDBPyConnection) -> None:
    table_names = [
        "vt_county_lines",
        "vt_town_lines",
        "vt_tract_lines",
    ]

    for name in table_names:
        con.execute(
            f"""--sql
            CREATE OR REPLACE TABLE lake.CLEANED.{name}_geom AS
            SELECT *
            FROM {name}
            """
        )


def clean(con: duckdb.DuckDBPyConnection) -> None:
    build_county_lines(con)
    build_town_lines(con)
    build_tract_lines(con)


def main(con: duckdb.DuckDBPyConnection):
    clean(con)
    add_to_lake(con)


if __name__ == "__main__":
    main()
