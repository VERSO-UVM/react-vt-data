CREATE OR REPLACE TABLE hazard AS
SELECT
    i.id,
    i.DFIRM_ID,
    i.FLD_AR_ID,
    i.STUDY_TYP,
    i.FLD_ZONE,
    i.ZONE_SUBTY,
    i.SFHA_TF,
    i.STATIC_BFE,
    i.V_DATUM,
    i.DEPTH,
    i.LEN_UNIT,
    i.VELOCITY,
    i.VEL_UNIT,
    i.AR_REVERT,
    i.DUAL_ZONE,
    i.SOURCE_CIT,
    g.geometry AS geom
FROM info AS i
INNER JOIN geom AS g USING (id);
