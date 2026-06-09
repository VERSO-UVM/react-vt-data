SELECT 
    year, 
    NAME, 
    Unemployment_Rate AS Value, 
    Unemployment_Rate AS Percent
FROM unemployment_rate
{where_string}
ORDER BY year