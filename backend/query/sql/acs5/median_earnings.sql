SELECT
    year,
    NAME,
    Value,
    -- quoted: the case change from `variable` is intentional (frontend key)
    variable AS "Variable" -- noqa: RF06
FROM acs5_median_earnings
{{ where_string }}
ORDER BY year
