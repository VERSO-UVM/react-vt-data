SELECT
    a.variable,
    -- Many ACS variables are stored as a raw count (Value) alongside its share
    -- of the total (Percent) -- e.g. Unemployment Rate is a headcount with the
    -- rate riding in Percent. The share is the meaningful figure for
    -- comparison across geographies of different sizes, so prefer it when
    -- present; count-only variables (Population, Median Age, ...) have no
    -- Percent and fall back to Value unchanged.
    COALESCE(a.percent, a.value) AS value,
    {% if margins %}
        -- The margin and reliability label of whichever figure `value` is. A
        -- warehouse built before margins were collected has neither column.
        CASE
            WHEN a.percent IS NOT NULL THEN a.percent_moe ELSE a.value_moe
        END AS moe,
        CASE
            WHEN a.percent IS NOT NULL THEN a.percent_reliability
            ELSE a.value_reliability
        END AS reliability,
    {% endif %}
    c.geoid,
    c.county,
    ST_ASGEOJSON(ST_GeomFromWKB(c.geometry)) AS geometry
FROM {{ table }} AS a
-- County rows in the tidy tables carry no geoid (it's only populated for
-- towns); the county FIPS is what identifies them.
LEFT JOIN vt_county_lines_geom AS c
    ON a.county_fips = c.geoid

{{ where_string }}
