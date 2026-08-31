"""
**Author**:
    Ian Sargent
**Created**:
    2026-08-28
**Description**:
    Data cleaning script for the raw `building_footprints` table in the DuckLake
    Run with:
python -m data_cleaning.clean_building_footprints
"""

import pandas as pd

from datastore.lake_build import con


## LOAD SPATIAL EXTENSION FUNCTION --------------------
def _load_spatial() -> None:
    """
    Load the spatial extension, installing it first if necessary.
    """
    try:
        con.execute("""LOAD spatial""")
    except Exception:
        con.execute("""INSTALL spatial""")
        con.execute("""LOAD spatial""")


def build_footprints() -> pd.DataFrame:
    """
    Clean building footprints polygons.
    """
    df = con.execute(
        """--sql
        SELECT
            OBJECTID AS object_id,
            E911TOWN AS town,
            COUNTY AS county,
            HEIGHTFT AS height_ft,
            SITETYPE AS building_type,
            POLY_TYPE AS print_type,
            ST_GeomFromWKB(geometry) AS geometry,
        FROM lake.RAW.building_footprints
        """
    ).df()

    # Capitalize the first character town and county columns
    df["town"] = df["town"].str.title()
    df["county"] = df["county"].str.capitalize() + " County, Vermont"
    df["NAME"] = df["town"] + ", " + df["county"]

    cols = [
        "object_id",
        "town",
        "county",
        "NAME",
        "height_ft",
        "building_type",
        "print_type",
        "geometry",
    ]
    return df[cols]


def add_to_lake(df: pd.DataFrame) -> None:
    con.execute(
        """--sql
        CREATE OR REPLACE TABLE lake.CLEANED.VCGI_buildingFootprints_geom AS
        SELECT *
        FROM df
        """
    )


def clean():
    _load_spatial()
    df = build_footprints()
    return df


def main():
    df = clean()
    add_to_lake(df)


if __name__ == "__main__":
    main()
