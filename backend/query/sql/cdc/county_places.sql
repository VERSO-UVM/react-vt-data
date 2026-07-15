SELECT
    p.LocationID,
    p.Measure,
    p.Data_Value,
    p.bin,
    ROUND(p.natl_pct * 100, 2)  AS natl_pct, 
    c.CountyFIPS,
    ST_ASGEOJSON(c.geom) AS geometry
FROM cdc_county_places AS p
LEFT JOIN vermont_counties AS c ON p.LocationID = c.CountyFIPS
{{ where_string }}
