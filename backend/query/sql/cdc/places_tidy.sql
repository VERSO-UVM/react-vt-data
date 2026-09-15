-- CDC PLACES columns are lowercase in the warehouse (unlike the ACS tables),
-- so every column needs an explicit alias to get Title Case in the response
-- — DuckDB preserves the source column's case for unaliased references.
SELECT
    Year AS Year,
    Category AS Category,
    Measure AS Measure,
    Data_Value AS Value,
    Data_Value_Unit AS Unit
FROM {{ table }}
{{ where_string }}
ORDER BY Category, Measure
