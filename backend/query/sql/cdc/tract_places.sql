SELECT
    p.LocationID,
    p.Measure,
    p.Data_Value,
    p.bin,
    ST_ASGEOJSON(c.geometry) AS geometry
FROM cdc_tract_places AS p
LEFT JOIN vermont_tracts AS c ON p.LocationID = c.LocationID
{{ where_string }}
