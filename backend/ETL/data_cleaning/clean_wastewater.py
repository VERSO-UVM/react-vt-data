"""
**Author**:
    Ian Sargent
**Created**:
    2026-07-14
**Description**:
    Data cleaning script for the raw wastewater tables in the DuckLake
    Run with:
python -m ETL.data_cleaning.clean_wastewater
"""

import pandas as pd

from datastore.lake_build import con

# TODO: Path is eseful when sql files are created!
# from build import BACKEND
# sql_path = BACKEND / "ETL" / "data_cleaning" / "sql"

# hardcoded specifics:

## soil suitability table info
suitability_info_cols = ["OGC_FID", "Suitability", "Jurisdiction", "RPC", "Acres"]
suitability_geom_cols = ["OGC_FID", "geometry"]

## wastewater service area table info
service_area_info_cols = [
    "TownID",
    "TreatmentFacility",
    "SystemName",
    "SystemOwner",
    "TownName",
    "Municipal_Name",
    "County",
    "RPC",
]

service_miscellaneous_info_cols = [
    "GISNotes",
    "GISDate",
    "GISUpdate",
    "Creator",
    "SourceFile",
    "GEOIDTXT",
]

service_geom_cols = ["ID", "geometry"]

## wastewater treatment facility table info
facility_info_cols = [
    "FacilityID",
    "DesignHydraulicCapacityInMGD",
    "SeptageReceivedAtThisFacility",
    "WWInventoryURL",
    "FacilityName",
    "TownName",
    "Municipal_Name",
    "County",
    "RPC",
]

permit_info_cols = [
    "ID",
    "PermitID",
    "PermitRecordID",
    "NPDESPermitNumber",
    "PermitLink",
    "PermitteeName",
]

facility_miscellaneous_info_cols = ["ID", "SourceFile", "GEOIDTXT"]
facility_geom_cols = ["ID", "Latitude", "Longitude", "geometry"]

# functions:


## LOAD SPATIAL EXTENSION --------------------
def _load_spatial() -> None:
    """
    Load the spatial extension, installing it first if necessary.
    """
    try:
        con.execute("LOAD spatial")
    except Exception:
        con.execute("INSTALL spatial")
        con.execute("LOAD spatial")


## SERVICE AREA TABLES --------------------
def build_service_info():
    cols = ", ".join(service_area_info_cols)

    con.execute(f"""
        CREATE OR REPLACE VIEW service_info AS
        SELECT {cols}
        FROM lake.RAW.ww_service_areas
    """)


def build_service_geom():
    con.execute("""
        CREATE OR REPLACE VIEW service_geom AS
        SELECT
            ID,
            ST_GeomFromWKB(geometry) AS geometry
        FROM lake.RAW.ww_service_areas
    """)


def build_service_misc():
    cols = ", ".join(service_miscellaneous_info_cols)

    con.execute(f"""
        CREATE OR REPLACE VIEW service_misc AS
        SELECT {cols}
        FROM lake.RAW.ww_service_areas
    """)


## TREATMENT FACILITY TABLES --------------------
def build_facility_info():
    cols = ", ".join(facility_info_cols)

    con.execute(f"""
        CREATE OR REPLACE VIEW treatment_facility_info AS
        SELECT {cols}
        FROM lake.RAW.ww_treatment_facilities
    """)


def build_facility_geom():
    con.execute("""
        CREATE OR REPLACE VIEW treatment_facility_geom AS
        SELECT
            ID,
            Latitude,
            Longitude,
            ST_GeomFromWKB(geometry) AS geometry
        FROM lake.RAW.ww_treatment_facilities
    """)


def build_facility_permits():
    cols = ", ".join(permit_info_cols)

    con.execute(f"""
        CREATE OR REPLACE VIEW treatment_facility_permit_info AS
        SELECT {cols}
        FROM lake.RAW.ww_treatment_facilities
    """)


def build_facility_misc():
    cols = ", ".join(facility_miscellaneous_info_cols)
    con.execute(f"""
        CREATE OR REPLACE VIEW treatment_facility_misc_info AS
        SELECT {cols}
        FROM lake.RAW.ww_treatment_facilities
    """)


## SOIL SUITABILITY TABLES --------------------

def add_soil_suitability_id():
    """
    Add a sequential "OGC_FID" identifier to the soil suitability table.
    """

    con.execute("""
        CREATE OR REPLACE VIEW soil_suitability_with_id AS
        SELECT
            ROW_NUMBER() OVER (
                ORDER BY
                    RPC,
                    Jurisdiction,
                    Suitability,
                    Acres
            ) - 1 AS OGC_FID,
            *
        FROM lake.RAW.septic_soil_suitability
    """)


def build_suitability_info():
    cols = ", ".join(suitability_info_cols)

    con.execute(f"""
        CREATE OR REPLACE VIEW soil_suitability_info AS
        SELECT {cols}
        FROM soil_suitability_with_id
    """)


def build_suitability_geom():
    con.execute("""
        CREATE OR REPLACE VIEW soil_suitability_geom AS
        SELECT
            OGC_FID,
            ST_GeomFromWKB(geometry) AS geometry
        FROM soil_suitability_with_id
    """)

## CLEANING PIPELINE --------------------

def clean():
    """
    Build cleaned wastewater views from RAW DuckLake tables.
    """

    _load_spatial()

    # service areas
    build_service_info()
    build_service_geom()
    build_service_misc()

    # treatment facilities
    build_facility_info()
    build_facility_geom()
    build_facility_permits()
    build_facility_misc()

    # soil suitability
    add_soil_suitability_id()
    build_suitability_info()
    build_suitability_geom()


def add_to_lake():
    """
    Persist cleaned wastewater tables into the CLEANED schema.
    """

    tables = [
        "service_info",
        "service_geom",
        "service_misc",
        "treatment_facility_info",
        "treatment_facility_geom",
        "treatment_facility_permit_info",
        "treatment_facility_misc_info",
        "soil_suitability_info",
        "soil_suitability_geom",
    ]

    for table in tables:
        con.execute(f"""
            CREATE OR REPLACE TABLE lake.CLEANED.wastewater_{table} AS
            SELECT *
            FROM {table}
        """)


def main():
    clean()
    add_to_lake()


if __name__ == "__main__":
    main()