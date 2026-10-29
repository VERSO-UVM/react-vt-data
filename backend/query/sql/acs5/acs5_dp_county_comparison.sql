-- One value per place per year for one Data Profile indicator, for the
-- Statewide County Comparison page. where_string (compiled by
-- query/county_comparison.py) picks the indicator's table, category, every
-- label path and measure name it has used, and the county/state/national rows.
SELECT
    -- Short display name: "Essex County, Vermont" -> "Essex"
    REGEXP_REPLACE(name, ' County, Vermont$', '') AS place,
    geo_type,
    CAST(year AS INTEGER) AS year,
    CAST(value AS DOUBLE) AS value
FROM {{ table }}
{{ where_string }}
-- Should two label paths ever overlap in a year, keep the "Percent" row so
-- each place still gets one bar.
QUALIFY
    ROW_NUMBER() OVER (
        PARTITION BY name, year ORDER BY measure = 'Percent' DESC
    ) = 1
ORDER BY year, place
