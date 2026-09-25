-- Every county's CDC PLACES estimate for the filtered measures, one row per
-- county and measure, so the Community Health report can show where a county
-- falls among Vermont's 14 (places_tidy.sql instead combines counties into
-- one row per measure). The caller pins data_value_type to age-adjusted.
-- CDC PLACES columns are lowercase in the warehouse, so every output column
-- needs an explicit alias to get Title Case.
SELECT
    county AS County,
    measure AS Measure,
    data_value AS Value
FROM {{ table }}
{{ where_string }}
ORDER BY Measure, County
