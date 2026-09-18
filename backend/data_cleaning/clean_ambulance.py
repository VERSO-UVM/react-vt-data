"""
**Author**:
    Atticus Tarleton
**Created**:
    2026-07-20
**Description**:
    Build script to convert the ambulance service area files into SQL tables.
"""

import duckdb

from data_cleaning.geo_lookup import lowercase_cols

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


AMBULANCE_RENAMES = {"OBJECTID": "object_id"}


def build_ambulance_info_table(con: duckdb.DuckDBPyConnection) -> None:
    """
    Create the ambulance `info` table in DuckLake.

    Args:
        con: DuckDBPyConnection to the DuckLake
    """
    info_cols_str = lowercase_cols(AMBULANCE_INFO_COLS, AMBULANCE_RENAMES)

    con.execute(
        f"""--sql
        CREATE OR REPLACE TABLE lake.CLEANED.VCGI_ambulanceService_info AS
        SELECT {info_cols_str}
        FROM lake.RAW.ambulance
        """
    )


def build_ambulance_geom_table(con: duckdb.DuckDBPyConnection) -> None:
    """
    Create the ambulance `geom` table in DuckLake.

    Args:
        con: DuckDBPyConnection to the DuckLake
    """
    geom_cols_str = lowercase_cols(AMBULANCE_GEOM_COLS, AMBULANCE_RENAMES)

    con.execute(
        f"""--sql
        CREATE OR REPLACE TABLE lake.CLEANED.VCGI_ambulanceService_geom AS
        SELECT {geom_cols_str}
        FROM lake.RAW.ambulance
        """
    )


def build_ambulance_color_table(con: duckdb.DuckDBPyConnection) -> None:
    """
    Create the ambulance `color` table in DuckLake.

    Args:
        con: DuckDBPyConnection to the DuckLake
    """
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
