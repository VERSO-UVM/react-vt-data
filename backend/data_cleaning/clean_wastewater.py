"""
**Author**:
    Ian Sargent
**Created**:
    2026-07-14
**Description**:
    Data cleaning script for the raw wastewater
    tables in the DuckLake
**Run with**:
python -m data_cleaning.clean_wastewater
"""

import duckdb


## ADD UNIQUE ID COLUMNS --------------------
def build_service_area_id(con: duckdb.DuckDBPyConnection) -> None:
    con.execute(
        """--sql
        CREATE OR REPLACE VIEW service_areas_with_id AS
        SELECT 
            ROW_NUMBER() 
            OVER(ORDER BY TownName, TreatmentFacility, SystemName)-1 AS Area_ID, * 
            FROM lake.RAW.ww_service_areas
        """
    )


def build_facility_id(con: duckdb.DuckDBPyConnection) -> None:
    con.execute(
        """--sql
        CREATE OR REPLACE VIEW treatment_facilities_with_id AS
        SELECT 
            ROW_NUMBER() 
            OVER(ORDER BY FacilityName,TownName)-1 AS Facility_ID, * 
            FROM lake.RAW.ww_treatment_facilities
        """
    )


def build_soil_combined(con: duckdb.DuckDBPyConnection) -> None:
    RPCs = [
        "ACRPC",
        "BCRC",
        "CCRPC",
        "CVRPC",
        "LCPC",
        "MARC",
        "NVDA",
        "NWRPC",
        "RRPC",
        "TRORC",
        "WRC",
    ]
    union = " UNION ALL ".join(
        [f"SELECT * FROM lake.RAW.ww_soil_suitability_{r}" for r in RPCs]
    )
    con.execute(
        f"""--sql
        CREATE OR REPLACE VIEW soil_suitability_combined AS {union}
        """
    )


def build_soil_suitability_id(con: duckdb.DuckDBPyConnection) -> None:
    con.execute(
        """--sql
        CREATE OR REPLACE VIEW soil_suitability_with_id AS
        SELECT 
            ROW_NUMBER() 
            OVER(ORDER BY RPC, Jurisdiction, Suitability,Acres)-1 AS OGC_FID, * 
            FROM soil_suitability_combined
        """
    )


## SERVICE AREA TABLES --------------------
def build_service_info(con: duckdb.DuckDBPyConnection) -> None:
    service_area_info_cols = [
        "Area_ID",
        "TownID",
        "TreatmentFacility",
        "SystemName",
        "SystemOwner",
        "TownName",
        "Municipal_Name",
        "County",
        "RPC",
    ]

    con.execute(
        f"""--sql
        CREATE OR REPLACE VIEW serviceAreas_info AS 
        SELECT {", ".join(service_area_info_cols)} 
        FROM service_areas_with_id
        """
    )


def build_service_geom(con: duckdb.DuckDBPyConnection) -> None:
    # service_geom_cols = ["Area_ID", "geometry"]
    con.execute(
        """--sql
        CREATE OR REPLACE VIEW serviceAreas_geom AS 
        SELECT 
            Area_ID, 
            ST_GeomFromWKB(geometry) AS geometry 
        FROM service_areas_with_id
        """
    )


def build_service_misc(con: duckdb.DuckDBPyConnection) -> None:
    service_miscellaneous_info_cols = [
        "Area_ID",
        "GISNotes",
        "GISDate",
        "GISUpdate",
        "Creator",
        "SourceFile",
        "GEOIDTXT",
    ]

    con.execute(
        f"""--sql
        CREATE OR REPLACE VIEW serviceAreas_misc AS 
        SELECT {", ".join(service_miscellaneous_info_cols)} 
        FROM service_areas_with_id
        """
    )


## TREATMENT FACILITY TABLES --------------------
def build_facility_info(con: duckdb.DuckDBPyConnection) -> None:
    facility_info_cols = [
        "Facility_ID",
        "DesignHydraulicCapacityInMGD",
        "SeptageReceivedAtThisFacility",
        "WWInventoryURL",
        "FacilityName",
        "TownName",
        "Municipal_Name",
        "County",
        "RPC",
    ]

    con.execute(
        f"""--sql
        CREATE OR REPLACE VIEW treatmentFacilities_info AS 
        SELECT {", ".join(facility_info_cols)} 
        FROM treatment_facilities_with_id
        """
    )


def build_facility_geom(con: duckdb.DuckDBPyConnection) -> None:
    # facility_geom_cols = ["Facility_ID", "Latitude", "Longitude", "geometry"]
    con.execute(
        """--sql
        CREATE OR REPLACE VIEW treatmentFacilities_geom AS 
        SELECT 
            Facility_ID, 
            Latitude, 
            Longitude, 
            ST_GeomFromWKB(geometry) AS geometry 
        FROM treatment_facilities_with_id
        """
    )


def build_facility_permits(con: duckdb.DuckDBPyConnection) -> None:
    permit_info_cols = [
        "Facility_ID",
        "PermitID",
        "PermitRecordID",
        "NPDESPermitNumber",
        "PermitLink",
        "PermitteeName",
    ]

    con.execute(
        f"""--sql
        CREATE OR REPLACE VIEW treatmentFacilitiesPermits_info AS 
        SELECT {", ".join(permit_info_cols)} 
        FROM treatment_facilities_with_id
        """
    )


def build_facility_misc(con: duckdb.DuckDBPyConnection) -> None:
    facility_miscellaneous_info_cols = ["Facility_ID", "SourceFile", "GEOIDTXT"]

    con.execute(
        f"""--sql
        CREATE OR REPLACE VIEW treatmentFacilitiesMisc_info AS 
        SELECT {", ".join(facility_miscellaneous_info_cols)} 
        FROM treatment_facilities_with_id
        """
    )


## SOIL SUITABILITY TABLES --------------------
def build_suitability_info(con: duckdb.DuckDBPyConnection) -> None:
    suitability_info_cols = ["OGC_FID", "Suitability", "Jurisdiction", "RPC", "Acres"]

    con.execute(
        f"""--sql
        CREATE OR REPLACE VIEW soilSuitability_info AS 
        SELECT {", ".join(suitability_info_cols)} 
        FROM soil_suitability_with_id
        """
    )


def build_suitability_geom(con: duckdb.DuckDBPyConnection) -> None:
    # suitability_geom_cols = ["OGC_FID", "geometry"]
    con.execute(
        """--sql
        CREATE OR REPLACE VIEW soilSuitability_geom AS 
        SELECT 
            OGC_FID, 
            ST_GeomFromWKB(geometry) AS geometry 
        FROM soil_suitability_with_id
        """
    )


def build_suitability_colors(con: duckdb.DuckDBPyConnection) -> None:
    con.execute(
        """--sql
        CREATE OR REPLACE TABLE soilSuitability_colors (
            soil_suitability   TEXT PRIMARY KEY,
            hex_color       TEXT NOT NULL,
            rgba            TEXT NOT NULL
        );

        INSERT INTO soilSuitability_colors VALUES
            ('Well Suited',         '#2ca02c', '[44, 160, 44, 180]'),
            ('Moderately Suited',   '#ffcc00', '[255, 204, 0, 180]'),
            ('Marginally Suited',   '#fd7e14', '[253, 126, 20, 180]'),
            ('Not Suited',          '#dc3545', '[220, 53, 69, 180]'),
            ('Not Rated',           '#6c757d', '[108, 117, 125, 180]');
        """
    )


## STORMWATER MANAGEMENT TABLES --------------------
def build_stormwater_info(con: duckdb.DuckDBPyConnection) -> None:
    # "Type" labels derived from VERSO WIM GitHub pages
    con.execute(
        """--sql
        CREATE OR REPLACE VIEW stormwaterManagement_info AS
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


def build_stormwater_geom(con: duckdb.DuckDBPyConnection) -> None:
    con.execute(
        """--sql
        CREATE OR REPLACE VIEW stormwaterManagement_geom AS 
        SELECT 
            GlobalID, 
            ST_GeomFromWKB(geometry) AS geometry 
        FROM lake.RAW.ww_stormwater_management_areas
        """
    )


## CLEANING PIPELINE --------------------
def clean(con: duckdb.DuckDBPyConnection):
    # Add unique IDs to each table
    build_service_area_id(con)
    build_facility_id(con)
    build_soil_combined(con)
    build_soil_suitability_id(con)

    # Service area tables
    build_service_info(con)
    build_service_geom(con)
    build_service_misc(con)

    # Treatment facility tables
    build_facility_info(con)
    build_facility_geom(con)
    build_facility_permits(con)
    build_facility_misc(con)

    # Soil suitability Tables
    build_suitability_info(con)
    build_suitability_geom(con)
    build_suitability_colors(con)

    # Stormwater Management Tables
    build_stormwater_info(con)
    build_stormwater_geom(con)


def add_to_lake(con: duckdb.DuckDBPyConnection):
    table_names = [
        "serviceAreas_info",
        "serviceAreas_geom",
        "serviceAreas_misc",
        "treatmentFacilities_info",
        "treatmentFacilities_geom",
        "treatmentFacilitiesPermits_info",
        "treatmentFacilitiesMisc_info",
        "soilSuitability_info",
        # NOTE: The `soilSuitabilitygeom` dataset below is too large for git storage. Add to .gitignore
        "soilSuitability_geom",
        "soilSuitability_colors",
        "stormwaterManagement_info",
        "stormwaterManagement_geom",
    ]

    for name in table_names:
        con.execute(
            f"""--sql
            CREATE OR REPLACE TABLE lake.CLEANED.VersoWastewater_{name} AS 
            SELECT * 
            FROM {name}
            """
        )


def main(con: duckdb.DuckDBPyConnection):
    clean(con)
    add_to_lake(con)


if __name__ == "__main__":
    main()
