-- Population density (people per square mile) per place per year, for the
-- Statewide County Comparison page. Same output columns as
-- acs5_dp_county_comparison.sql, without margins: land area has none.
-- where_string (compiled by query/county_comparison.py) picks the population
-- rows; each is divided by its place's land area. The national row's geoid is
-- NULL in both tables, so the join uses IS NOT DISTINCT FROM (NULL matches
-- NULL), and geo_type keeps a NULL from matching the wrong kind of place.
WITH population AS (
    SELECT
        name,
        geo_type,
        geoid,
        year,
        value
    FROM {{ table }}
    {{ where_string }}
)

SELECT
    -- Short display name: "Essex County, Vermont" -> "Essex"
    REGEXP_REPLACE(p.name, ' County, Vermont$', '') AS place,
    p.geo_type,
    CAST(p.year AS INTEGER) AS year,
    CAST(p.value / l.land_sqmi AS DOUBLE) AS value
FROM population AS p
INNER JOIN {{ land_table }} AS l
    ON
        p.geo_type = l.geo_type
        AND p.geoid IS NOT DISTINCT FROM l.geoid
ORDER BY year, place
