-- Parts of a town that no zoning district covers: the "we have no zoning
-- information here" layer.
--
-- Both inputs are WGS84 (zoning_raw ships as EPSG:4326; town_boundaries is
-- normalised to it in build/FIPS_data.py), so the difference is taken directly.
--
-- ST_MakeValid before the union matters: several districts are self-intersecting
-- and ST_Union_Agg raises a topology error on them otherwise.
--
-- The result is exploded into individual polygons so that slivers can be
-- dropped. Town and district boundaries were digitised separately, so nearly
-- every zoned town has hairline gaps along its edges; keeping them would draw
-- grey outlines around the whole state. Filtering parts under {{ min_acres }}
-- acres removes ~91% of the pieces while keeping >99.7% of the genuinely
-- unzoned area.

CREATE OR REPLACE VIEW empty_geom AS
WITH covered AS (
    SELECT
        GEO_ID,
        ST_UNION_AGG(ST_MAKEVALID(geom)) AS geom
    FROM lake.RAW.zoning
    GROUP BY GEO_ID
),

gaps AS (
    SELECT
        t.FIPS_ID,
        t.TOWN_NAME,
        ST_DIFFERENCE(
            t.geometry,
            COALESCE(c.geom, ST_GEOMFROMTEXT('POLYGON EMPTY'))
        ) AS geom
    FROM town_boundaries AS t
    LEFT JOIN covered AS c ON t.FIPS_ID = c.GEO_ID
),

-- recursive := true expands the ST_Dump STRUCT into plain `geom`/`path`
-- columns, one row per polygon
exploded AS (
    SELECT
        g.FIPS_ID,
        g.TOWN_NAME,
        UNNEST(ST_DUMP(g.geom), recursive := true)  -- noqa: AL03
    FROM gaps AS g
    WHERE NOT ST_ISEMPTY(g.geom)
),

sized AS (
    SELECT
        e.FIPS_ID,
        e.TOWN_NAME,
        e.geom,
        ST_AREA_SPHEROID(e.geom) / 4046.8564224 AS Acres
    FROM exploded AS e
)

SELECT
    s.FIPS_ID,
    s.TOWN_NAME,
    s.geom,
    ROUND(s.Acres, 2) AS Acres
FROM sized AS s
WHERE s.Acres >= {{ min_acres }};
