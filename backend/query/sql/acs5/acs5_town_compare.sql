SELECT
    a.Variable,
    -- see acs5_county_compare.sql: prefer the share-of-total (Percent) over
    -- the raw count (Value) when the variable has one.
    COALESCE(a.Percent, a.Value) AS Value,
    t.FIPS_ID,
    t.TOWN_NAME,
    ST_ASGEOJSON(ST_GeomFromWKB(t.geometry)) AS geometry
FROM {{ table }} AS a
LEFT JOIN vt_town_lines_geom AS t
    ON a.Jurisdiction = t.TOWN_NAME

{{ where_string }}
