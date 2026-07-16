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

from datastore.lake_build import con

# TODO: Path is useful when sql files are created!
# from build import BACKEND
# sql_path = BACKEND / "ETL" / "data_cleaning" / "sql"


## LOAD SPATIAL EXTENSION FUNCTION --------------------
def _load_spatial() -> None:
    """
    Load the spatial extension, installing it first if necessary.
    """
    try:
        con.execute("LOAD spatial")
    except Exception:
        con.execute("INSTALL spatial")
        con.execute("LOAD spatial")


## ADD UNIQUE ID COLUMNS

def add_service_area_id():
    con.execute(
        """
        CREATE OR REPLACE VIEW service_areas_with_id AS
        SELECT 
            ROW_NUMBER() 
            OVER(ORDER BY TownName, TreatmentFacility, SystemName)-1 AS Area_ID, * 
            FROM lake.RAW.ww_service_areas
        """)


def add_facility_id():
    con.execute(
        """
        CREATE OR REPLACE VIEW treatment_facilities_with_id AS
        SELECT 
            ROW_NUMBER() 
            OVER(ORDER BY FacilityName,TownName)-1 AS Facility_ID, * 
            FROM lake.RAW.ww_treatment_facilities
        """)


def build_soil_combined():
    RPCs = ["ACRPC", "BCRC", "CCRPC", "CVRPC", "LCPC", "MARC", "NVDA", "NWRPC", "RRPC", "TRORC", "WRC"]
    union=" UNION ALL ".join([f"SELECT * FROM lake.RAW.ww_soil_suitability_{r}" for r in RPCs])
    con.execute(f"CREATE OR REPLACE VIEW soil_suitability_combined AS {union}")


def add_soil_suitability_id():
    con.execute(
        """
        CREATE OR REPLACE VIEW soil_suitability_with_id AS
        SELECT 
            ROW_NUMBER() 
            OVER(ORDER BY RPC, Jurisdiction, Suitability,Acres)-1 AS OGC_FID, * 
            FROM soil_suitability_combined
        """)



## SERVICE AREA TABLES --------------------
def build_service_info():
    service_area_info_cols = [
        "Area_ID", "TownID", "TreatmentFacility", "SystemName",
        "SystemOwner", "TownName", "Municipal_Name", "County", "RPC"]
    
    con.execute(
        f"""
        CREATE OR REPLACE VIEW service_info AS 
        SELECT {', '.join(service_area_info_cols)} 
        FROM service_areas_with_id
        """)
    

def build_service_geom():
    # service_geom_cols = ["Area_ID", "geometry"]
    
    con.execute(
        """
        CREATE OR REPLACE VIEW service_geom AS 
        SELECT 
            Area_ID, 
            ST_GeomFromWKB(geometry) geometry 
        FROM service_areas_with_id
        """)

    
def build_service_misc():
    service_miscellaneous_info_cols = [
        "Area_ID", "GISNotes", "GISDate", "GISUpdate",
        "Creator", "SourceFile", "GEOIDTXT"]
    
    con.execute(
        f"""
        CREATE OR REPLACE VIEW service_misc AS 
        SELECT {', '.join(service_miscellaneous_info_cols)} 
        FROM service_areas_with_id
        """)


## TREATMENT FACILITY TABLES --------------------
def build_facility_info():
    facility_info_cols = [
        "Facility_ID", "DesignHydraulicCapacityInMGD", "SeptageReceivedAtThisFacility",
        "WWInventoryURL", "FacilityName", "TownName", "Municipal_Name", "County", "RPC"]
    
    con.execute(
        f"""
        CREATE OR REPLACE VIEW treatment_facility_info AS 
        SELECT {', '.join(facility_info_cols)} 
        FROM treatment_facilities_with_id
        """)
    

def build_facility_geom():
    # facility_geom_cols = ["Facility_ID", "Latitude", "Longitude", "geometry"]
    
    con.execute(
        """
        CREATE OR REPLACE VIEW treatment_facility_geom AS 
        SELECT 
            Facility_ID, 
            Latitude, 
            Longitude, 
            ST_GeomFromWKB(geometry) geometry 
        FROM treatment_facilities_with_id
        """)
    

def build_facility_permits():
    permit_info_cols = [
        "Facility_ID", "PermitID", "PermitRecordID", "NPDESPermitNumber",
        "PermitLink", "PermitteeName"]
    
    con.execute(
        f"""
        CREATE OR REPLACE VIEW treatment_facility_permit_info AS 
        SELECT {', '.join(permit_info_cols)} 
        FROM treatment_facilities_with_id
        """)


def build_facility_misc():
    facility_miscellaneous_info_cols = ["Facility_ID", "SourceFile", "GEOIDTXT"]
    
    con.execute(
        f"""
        CREATE OR REPLACE VIEW treatment_facility_misc_info AS 
        SELECT {', '.join(facility_miscellaneous_info_cols)} 
        FROM treatment_facilities_with_id
        """)

## SOIL SUITABILITY TABLES --------------------

def build_suitability_info():
    suitability_info_cols = ["OGC_FID", "Suitability", "Jurisdiction", "RPC", "Acres"]
    
    con.execute(
        f"""
        CREATE OR REPLACE VIEW soil_suitability_info AS 
        SELECT {', '.join(suitability_info_cols)} 
        FROM soil_suitability_with_id
        """)


def build_suitability_geom():
    # suitability_geom_cols = ["OGC_FID", "geometry"]
    
    con.execute(
        """
        CREATE OR REPLACE VIEW soil_suitability_geom AS 
        SELECT 
            OGC_FID, 
            ST_GeomFromWKB(geometry) geometry 
        FROM soil_suitability_with_id
        """)


## CLEANING PIPELINE --------------------

def clean():
    # Load spatial extension in SQL
    _load_spatial()

    # Add unique IDs to each table
    add_service_area_id()
    add_facility_id()
    build_soil_combined()
    add_soil_suitability_id()

    # Service area tables
    build_service_info()
    build_service_geom()
    build_service_misc()

    # Treatment facility tables
    build_facility_info()
    build_facility_geom()
    build_facility_permits()
    build_facility_misc()

    # Soil suitability Tables
    build_suitability_info()
    build_suitability_geom()


def add_to_lake():
    table_names = [
        "service_info",
        "service_geom",
        "service_misc",

        "treatment_facility_info",
        "treatment_facility_geom",
        "treatment_facility_permit_info",
        "treatment_facility_misc_info",

        "soil_suitability_info",
        # NOTE: This dataset is too large for git storage. Add to .gitignore
        # "soil_suitability_geom"
    ]
    
    
    for name in table_names:
        con.execute(
            f"""
            CREATE OR REPLACE TABLE lake.CLEANED.wastewater_{name} AS 
            SELECT * 
            FROM {name}
            """)


def main():
    clean()
    add_to_lake()


if __name__=="__main__":
    main()