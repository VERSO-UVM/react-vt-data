SELECT
    p.LocationID,
    p.Measure,
    p.Data_Value,
     p.bin,
    c.CountyFIPS,
    ST_ASGEOJSON(c.geom) AS geometry
FROM cdc_places p
LEFT JOIN  vermont_counties c ON p.LocationID = c.CountyFIPS
WHERE p.Measure IN ('Hearing disability among adults', 'Depression among adults')