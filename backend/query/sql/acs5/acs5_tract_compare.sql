-- Tract-level ACS indicators (acs5_tract_tidy) with 2020 tract boundaries,
-- the same shapes CDC PLACES tracts join to, so the two merge on geoid.
SELECT
    a.variable,
    COALESCE(a.percent, a.value) AS value,
    a.geoid,
    a.name,
    ST_ASGEOJSON(ST_GEOMFROMWKB(t.geometry)) AS geometry
FROM {{ table }} AS a
LEFT JOIN vt_tract_lines_geom AS t
    ON a.geoid = t.LocationID

{{ where_string }}
