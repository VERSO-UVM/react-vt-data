SELECT
    year,
    NAME,
    Value,
    Value AS Percent
FROM acs5_unemployment_rate
{{ where_string }}
ORDER BY year
