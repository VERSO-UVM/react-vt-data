CREATE OR REPLACE TABLE info AS
SELECT

    -- Unique ID assigned by FEMA
    OBJECTID AS id,

    -- Indicates whether the flood zone is under heightened risk
    AR_REVERT,

    -- FEMA Digital Flood Insurance Rate Map identifier
    DFIRM_ID,

    -- Version number of the FEMA flood hazard dataset
    VERSION_ID,

    -- Unique flood area identifier used by FEMA
    FLD_AR_ID,

    -- Type of flood study conducted
    STUDY_TYP,

    -- FEMA flood zone designation
    FLD_ZONE,

    --Subtype of the flood zone providing additional classification detail
    ZONE_SUBTY,

    -- Indicates whether the area is a Special Flood Hazard Area
    SFHA_TF,

    -- Base Flood Elevation in feet
    STATIC_BFE,

    -- Vertical datum used for the BFE measurement
    V_DATUM,

    -- Flood depth in feet
    DEPTH,

    -- Unit of measurement for linear values
    LEN_UNIT,

    -- Flood velocity in feet per second
    VELOCITY,

    -- Unit of measurement for velocity values
    VEL_UNIT,

    -- Indicates whether the area is part of dual-zone classification
    DUAL_ZONE,

    -- Citation or reference for the source of the flood hazard data
    SOURCE_CIT
FROM raw;
