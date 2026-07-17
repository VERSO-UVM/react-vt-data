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
        con.execute(
            """--sql
            LOAD spatial
            """)
    except Exception:
        con.execute(
            """--sql
            INSTALL spatial
            """)
        con.execute(
            """--sql
            LOAD spatial
            """)


## ADD UNIQUE ID COLUMNS --------------------
def build_service_area_id() -> None:
    con.execute(
        """--sql
        CREATE OR REPLACE VIEW service_areas_with_id AS
        SELECT 
            ROW_NUMBER() 
            OVER(ORDER BY TownName, TreatmentFacility, SystemName)-1 AS Area_ID, * 
            FROM lake.RAW.ww_service_areas
        """)


def build_facility_id() -> None:
    con.execute(
        """--sql
        CREATE OR REPLACE VIEW treatment_facilities_with_id AS
        SELECT 
            ROW_NUMBER() 
            OVER(ORDER BY FacilityName,TownName)-1 AS Facility_ID, * 
            FROM lake.RAW.ww_treatment_facilities
        """)


def build_soil_combined() -> None:
    RPCs = ["ACRPC", "BCRC", "CCRPC", "CVRPC", "LCPC", "MARC", "NVDA", "NWRPC", "RRPC", "TRORC", "WRC"]
    union=" UNION ALL ".join([f"SELECT * FROM lake.RAW.ww_soil_suitability_{r}" for r in RPCs])
    con.execute(
        f"""--sql
        CREATE OR REPLACE VIEW soil_suitability_combined AS {union}
        """)


def build_soil_suitability_id() -> None:
    con.execute(
        """--sql
        CREATE OR REPLACE VIEW soil_suitability_with_id AS
        SELECT 
            ROW_NUMBER() 
            OVER(ORDER BY RPC, Jurisdiction, Suitability,Acres)-1 AS OGC_FID, * 
            FROM soil_suitability_combined
        """)



## SERVICE AREA TABLES --------------------
def build_service_info() -> None:
    service_area_info_cols = [
        "Area_ID", "TownID", "TreatmentFacility", "SystemName",
        "SystemOwner", "TownName", "Municipal_Name", "County", "RPC"]
    
    con.execute(
        f"""--sql
        CREATE OR REPLACE VIEW service_info AS 
        SELECT {', '.join(service_area_info_cols)} 
        FROM service_areas_with_id
        """)
    

def build_service_geom() -> None:
    # service_geom_cols = ["Area_ID", "geometry"]
    con.execute(
        """--sql
        CREATE OR REPLACE VIEW service_geom AS 
        SELECT 
            Area_ID, 
            ST_GeomFromWKB(geometry) AS geometry 
        FROM service_areas_with_id
        """)

    
def build_service_misc() -> None:
    service_miscellaneous_info_cols = [
        "Area_ID", "GISNotes", "GISDate", "GISUpdate",
        "Creator", "SourceFile", "GEOIDTXT"]
    
    con.execute(
        f"""--sql
        CREATE OR REPLACE VIEW service_misc AS 
        SELECT {', '.join(service_miscellaneous_info_cols)} 
        FROM service_areas_with_id
        """)


## TREATMENT FACILITY TABLES --------------------
def build_facility_info() -> None:
    facility_info_cols = [
        "Facility_ID", "DesignHydraulicCapacityInMGD", "SeptageReceivedAtThisFacility",
        "WWInventoryURL", "FacilityName", "TownName", "Municipal_Name", "County", "RPC"]
    
    con.execute(
        f"""--sql
        CREATE OR REPLACE VIEW treatment_facility_info AS 
        SELECT {', '.join(facility_info_cols)} 
        FROM treatment_facilities_with_id
        """)
    

def build_facility_geom() -> None:
    # facility_geom_cols = ["Facility_ID", "Latitude", "Longitude", "geometry"]
    con.execute(
        """--sql
        CREATE OR REPLACE VIEW treatment_facility_geom AS 
        SELECT 
            Facility_ID, 
            Latitude, 
            Longitude, 
            ST_GeomFromWKB(geometry) AS geometry 
        FROM treatment_facilities_with_id
        """)
    

def build_facility_permits() -> None:
    permit_info_cols = [
        "Facility_ID", "PermitID", "PermitRecordID", "NPDESPermitNumber",
        "PermitLink", "PermitteeName"]
    
    con.execute(
        f"""--sql
        CREATE OR REPLACE VIEW treatment_facility_permit_info AS 
        SELECT {', '.join(permit_info_cols)} 
        FROM treatment_facilities_with_id
        """)


def build_facility_misc() -> None:
    facility_miscellaneous_info_cols = ["Facility_ID", "SourceFile", "GEOIDTXT"]
    
    con.execute(
        f"""--sql
        CREATE OR REPLACE VIEW treatment_facility_misc_info AS 
        SELECT {', '.join(facility_miscellaneous_info_cols)} 
        FROM treatment_facilities_with_id
        """)

## SOIL SUITABILITY TABLES --------------------

def build_suitability_info() -> None:
    suitability_info_cols = ["OGC_FID", "Suitability", "Jurisdiction", "RPC", "Acres"]
    
    con.execute(
        f"""--sql
        CREATE OR REPLACE VIEW soil_suitability_info AS 
        SELECT {', '.join(suitability_info_cols)} 
        FROM soil_suitability_with_id
        """)


def build_suitability_geom() -> None:
    # suitability_geom_cols = ["OGC_FID", "geometry"]
    con.execute(
        """--sql
        CREATE OR REPLACE VIEW soil_suitability_geom AS 
        SELECT 
            OGC_FID, 
            ST_GeomFromWKB(geometry) AS geometry 
        FROM soil_suitability_with_id
        """)


## STORMWATER MANAGEMENT TABLES --------------------

def build_stormwater_info() -> None:
    # "Type" labels derived from VERSO WIM GitHub pages 
    con.execute(
        """--sql
        CREATE OR REPLACE VIEW stormwater_management_info AS
        SELECT
            CASE Type
                WHEN 2 THEN 'Bioretention / Rain Garden'
                WHEN 6 THEN 'Wet Pond'
                WHEN 7 THEN 'Dry Detention Pond'
                WHEN 8 THEN 'Infiltration Basin (Shallow)'
                WHEN 9 THEN 'Detention Basin (General)'
                WHEN 10 THEN 'Roadside Ditch / Buffer Strip'
                WHEN 13 THEN 'Extended Detention Basin'
                WHEN 14 THEN 'Pervious Pavement Area'
                WHEN 15 THEN 'Filter Strip'
                WHEN 16 THEN 'Grass Swale'
                WHEN 17 THEN 'Other / Unknown'
                WHEN 18 THEN 'Cistern / Underground Storage'
                WHEN 19 THEN 'Infiltration Basin / Trench'
                WHEN 20 THEN 'Sand Filter'
                WHEN 21 THEN 'Constructed Wetland'
                ELSE CAST(Type AS VARCHAR)
            END AS Type,
            Status,
            GEOIDTXT,
            GlobalID,
            Municipal_Name,
            County,
            RPC
        FROM lake.RAW.ww_stormwater_management_areas
        """
    )
    

def build_stormwater_geom() -> None:
    con.execute(
        """--sql
        CREATE OR REPLACE VIEW stormwater_management_geom AS 
        SELECT 
            GlobalID, 
            ST_GeomFromWKB(geometry) AS geometry 
        FROM lake.RAW.ww_stormwater_management_areas
        """)


## CLEANING PIPELINE --------------------

def clean():
    # Load spatial extension in SQL
    _load_spatial()

    # Add unique IDs to each table
    build_service_area_id()
    build_facility_id()
    build_soil_combined()
    build_soil_suitability_id()

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

    # Stormwater Management Tables
    build_stormwater_info()
    build_stormwater_geom()


def add_to_lake():
    table_names = [
        "serviceAreas_info",
        "serviceAreas_geom",
        "serviceAreas_misc",

        "treatmentFacilities_info",
        "treatmentFacilities_geom",
        "treatmentFacilityPermits_info",
        "treatmentFacilityMisc_info",

        "soilSuitability_info",
        # NOTE: This `geom` dataset is too large for git storage. Add to .gitignore
        "soilSuitability_geom",

        "stormwaterManagement_info",
        "stormwaterManagement_geom"

    ]
    
    for name in table_names:
        con.execute(
            f"""--sql
            CREATE OR REPLACE TABLE lake.CLEANED.wastewater_{name} AS 
            SELECT * 
            FROM {name}
            """)


def main():
    clean()
    add_to_lake()


if __name__=="__main__":
    main()