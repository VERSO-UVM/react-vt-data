SELECT
    p.geoid,
    p.measure,
    p.data_value,
    p.bin,
    ROUND(p.natl_pct * 100, 2) AS natl_pct,
    ST_ASGEOJSON(ST_GeomFromWKB(c.geometry)) AS geometry,
    c.name
FROM cdc_places_tract AS p
LEFT JOIN vt_tract_lines_geom AS c
    ON p.geoid = c.LocationID

{{ where_string }}
