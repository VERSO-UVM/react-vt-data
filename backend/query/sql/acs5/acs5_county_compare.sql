SELECT
    a.Variable,
    -- Many ACS variables are stored as a raw count (Value) alongside its share
    -- of the total (Percent) -- e.g. Unemployment Rate is a headcount with the
    -- rate riding in Percent. The share is the meaningful figure for
    -- comparison across geographies of different sizes, so prefer it when
    -- present; count-only variables (Population, Median Age, ...) have no
    -- Percent and fall back to Value unchanged.
    COALESCE(a.Percent, a.Value) AS Value,
    c.CountyFIPS,
    c.CountyName,
    ST_ASGEOJSON(ST_GeomFromWKB(c.geometry)) AS geometry
FROM {{ table }} AS a
LEFT JOIN vt_county_lines_geom AS c
    ON LPAD(a.state, 2, '0') || LPAD(a.county, 3, '0') = c.CountyFIPS

{{ where_string }}
