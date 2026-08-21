SELECT
    p.LocationID,
    p.Measure,
    p.Data_Value,
    p.bin,
    ROUND(p.natl_pct * 100, 2) AS natl_pct,
    ST_AsGeoJSON(c.geometry) AS geometry,
    c.name
FROM cdc_places_tract AS p
LEFT JOIN vt_tract_lines_geom AS c
    ON p.LocationID = c.LocationID

{{ where_string }}