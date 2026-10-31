-- County lines carry their own county column; drop it so an unqualified
-- "county" filter in the WHERE clause resolves to the PLACES row.
WITH county_lines AS (
    SELECT * EXCLUDE (county)
    FROM vt_county_lines_geom
)

SELECT
    p.geoid,
    p.measure,
    p.data_value,
    p.bin,
    ROUND(p.natl_pct * 100, 2) AS natl_pct,
    p.county,
    ST_ASGEOJSON(ST_GeomFromWKB(c.geometry)) AS geometry
FROM cdc_places_county AS p
LEFT JOIN county_lines AS c
    ON p.geoid = c.geoid
{{ where_string }}
