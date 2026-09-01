"""
**Author**:
    Atticus Tarleton
**Created**:
    2026-07-20
**Description**:
    Build script to convert the ambulance service area files into SQL tables.
"""

import duckdb

# Hardcoded column selections
AMBULANCE_INFO_COLS = [
    "OBJECTID",
    "Serv_Name",
    "Cert_Level",
    "Address",
    "Street_1",
    "Street_2",
    "City",
    "State",
    "Zip_Code",
    "Total_Tran",
    "Per_No_Tran",
    "Re_Per_Tran",
    "Cost_Per",
    "Cost_Call",
]

AMBULANCE_GEOM_COLS = [
    "OBJECTID",
    "Shape__Area",
    "Shape__Length",
    "geometry",
]


def build_ambulance_info_table(con: duckdb.DuckDBPyConnection):
    """Create the cleaned info table in DuckLake."""
    info_cols_str = ", ".join(AMBULANCE_INFO_COLS)

    con.execute(
        f"""--sql
        CREATE OR REPLACE TABLE lake.CLEANED.VCGI_ambulanceService_info AS
        SELECT {info_cols_str}
        FROM lake.RAW.ambulance
        """
    )


def build_ambulance_geom_table(con: duckdb.DuckDBPyConnection):
    """Create the cleaned spatial table in DuckLake."""
    geom_cols_str = ", ".join(AMBULANCE_GEOM_COLS)

    con.execute(
        f"""--sql
        CREATE OR REPLACE TABLE lake.CLEANED.VCGI_ambulanceService_geom AS
        SELECT {geom_cols_str}
        FROM lake.RAW.ambulance
        """
    )


def build_ambulance_color_table(con: duckdb.DuckDBPyConnection):
    """Create and populate the certification level colors lookup table."""
    con.execute(
        """--sql
        CREATE OR REPLACE TABLE lake.CLEANED.VCGI_ambulanceService_colors AS
        SELECT * FROM (
            VALUES
                ('Paramedic', '#2ca02c', '[44, 160, 44, 180]'),
                ('Advanced EMT', '#ffcc00', '[255, 204, 0, 180]'),
                ('Paramedic - Critical Care Endorsement', '#fd7e14', '[253, 126, 20, 180]')
        ) AS t(certification_level, hex_color, rgba)
        """
    )


def clean(con: duckdb.DuckDBPyConnection):
    build_ambulance_info_table(con)
    build_ambulance_geom_table(con)
    build_ambulance_color_table(con)


def main(con: duckdb.DuckDBPyConnection):
    clean(con)
    print("Successfully built ambulance service tables.")


if __name__ == "__main__":
    main()
