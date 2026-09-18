-- The response keeps the Title Case field names the frontend reads; the tidy
-- tables store them lowercase, and DuckDB would otherwise echo that casing.
SELECT
    year,
    section AS Section,
    variable AS Variable,
    value AS Value,
    percent AS Percent
FROM {{ table }}
{{ where_string }}
ORDER BY year, Section, Variable
