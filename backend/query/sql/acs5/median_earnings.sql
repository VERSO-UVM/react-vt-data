SELECT 
    year, 
    NAME, 
    Value AS Value, 
    variable AS Variable
FROM acs5_median_earnings
{where_string}
ORDER BY year