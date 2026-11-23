SELECT
    a.variable,
    -- see acs5_county_compare.sql: prefer the share-of-total (Percent) over
    -- the raw count (Value) when the variable has one.
    COALESCE(a.percent, a.value) AS value,
    {% if margins %}
        -- see acs5_county_compare.sql: the margin of whichever figure
        -- `value` is.
        CASE
            WHEN a.percent IS NOT NULL THEN a.percent_moe ELSE a.value_moe
        END AS moe,
        CASE
            WHEN a.percent IS NOT NULL THEN a.percent_reliability
            ELSE a.value_reliability
        END AS reliability,
    {% endif %}
    t.FIPS_ID,
    t.TOWN_NAME,
    ST_ASGEOJSON(ST_GeomFromWKB(t.geometry)) AS geometry
FROM {{ table }} AS a
LEFT JOIN vt_town_lines_geom AS t
    ON a.geoid = t.FIPS_ID

{{ where_string }}
