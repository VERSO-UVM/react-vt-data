SELECT
    p.LocationID,
    p.Measure,
    p.Data_Value,
    p.bin,
    ROUND(p.natl_pct * 100, 2) AS natl_pct,
    c.CountyFIPS,
    c.CountyName,
    ST_ASGEOJSON(ST_GeomFromWKB(c.geometry)) AS geometry
FROM cdc_places_county AS p
LEFT JOIN vt_county_lines_geom AS c
    ON p.LocationID = c.CountyFIPS

{{ where_string }}