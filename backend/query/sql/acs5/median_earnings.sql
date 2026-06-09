SELECT 
    year, 
    NAME, 
    estimate AS Value, 
    variable AS Variable
FROM median_earnings
{where_string}
ORDER BY year