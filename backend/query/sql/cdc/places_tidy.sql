-- CDC PLACES publishes estimates for each county but none for Vermont as a
-- whole, and this response has no county column. So each measure is combined
-- across whichever counties the filter selects:
--   * one county: that county's own estimate, unchanged;
--   * no county filter (a statewide pick): a Vermont estimate, the county
--     values averaged and weighted by each county's adult population.
-- Returning one row per county instead left callers to take whichever came
-- first and label it Vermont. If any selected county lacks a value or an
-- adult population for a measure, Value is NULL rather than an average of
-- the rest.
--
-- CDC's total_pop_18plus is stored as text with thousands separators.
-- CDC PLACES columns are lowercase in the warehouse (unlike the ACS tables),
-- so every output column needs an explicit alias to get Title Case.
WITH filtered AS (
    SELECT
        year,
        category,
        measure,
        data_value_unit,
        county,
        data_value,
        TRY_CAST(
            REPLACE(CAST(total_pop_18plus AS VARCHAR), ',', '') AS DOUBLE
        ) AS total_pop_18plus
    FROM {{ table }}
    {{ where_string }}
),

selected AS (
    SELECT
        year,
        COUNT(DISTINCT county) AS n_counties
    FROM filtered
    GROUP BY year
)

SELECT
    f.year AS Year,
    f.category AS Category,
    f.measure AS Measure,
    CASE
        WHEN
            COUNT(*) = ANY_VALUE(s.n_counties)
            AND COUNT(DISTINCT f.county) = ANY_VALUE(s.n_counties)
            AND COUNT(f.data_value) = COUNT(*)
            AND COUNT(*) FILTER (WHERE f.total_pop_18plus > 0) = COUNT(*)
            THEN ROUND(SUM(f.data_value * f.total_pop_18plus) / SUM(f.total_pop_18plus), 1)
    END AS Value,
    f.data_value_unit AS Unit
FROM filtered AS f
INNER JOIN selected AS s ON f.year = s.year
GROUP BY f.year, f.category, f.measure, f.data_value_unit
ORDER BY Category, Measure
