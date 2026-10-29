-- The response keeps the Title Case field names the frontend reads; the tidy
-- tables store them lowercase, and DuckDB would otherwise echo that casing.
SELECT
    year,
    section AS Section,
    variable AS Variable,
    value AS Value,
    value_moe AS Value_MOE,
    value_reliability AS Value_Reliability,
    percent AS Percent,
    percent_moe AS Percent_MOE,
    percent_reliability AS Percent_Reliability
FROM {{ table }}
{{ where_string }}
ORDER BY year, Section, Variable
