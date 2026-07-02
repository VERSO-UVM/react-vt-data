SELECT 
    year, 
    NAME, 
    Value, 
    Variable
FROM acs5_snapshot
{where_string}
ORDER BY year