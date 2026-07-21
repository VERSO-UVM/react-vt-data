SELECT
    p.LocationID,
    p.Measure,
    p.Data_Value,
    p.bin,
    ROUND(p.natl_pct * 100, 2)  AS natl_pct,
    ST_ASGEOJSON(c.geometry) AS geometry,
    c.name
FROM cdc_tract_places AS p
LEFT JOIN vermont_tracts AS c ON p.LocationID = c.LocationID
{{ where_string }}