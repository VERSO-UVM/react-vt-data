-- CDC PLACES publishes estimates for each county but none for Vermont as a
-- whole, and this response has no county column. So each measure is combined
-- across whichever counties the filter selects:
--   * one county: that county's own estimate and 95% interval, unchanged;
--   * no county filter (a statewide pick): a Vermont estimate, the county
--     values averaged and weighted by each county's adult population. Its
--     interval is conservative: PLACES estimates come from one shared model,
--     so their errors are far from independent, and assuming they move
--     together makes the half-width the adult-weighted average of the county
--     half-widths (an upper bound; the true interval is somewhat narrower).
-- Returning one row per county instead left callers to take whichever came
-- first and label it Vermont. If any selected county lacks a value or an
-- adult population for a measure, Value is NULL rather than an average of
-- the rest; likewise Low/High if any county lacks an interval.
--
-- Key_Indicator is looked up per measure: clean_cdc.py only sets
-- sme_highlight on crude-prevalence rows, not the age-adjusted rows used here.
-- CDC's total_pop_18plus and interval limits are stored as text.
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
        TRY_CAST(low_confidence_limit AS DOUBLE) AS low,
        TRY_CAST(high_confidence_limit AS DOUBLE) AS high,
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
),

combined AS (
    SELECT
        f.year,
        f.category,
        f.measure,
        f.data_value_unit,
        COUNT(*) AS n,
        COUNT(*) = ANY_VALUE(s.n_counties)
        AND COUNT(DISTINCT f.county) = ANY_VALUE(s.n_counties)
        AND COUNT(f.data_value) = COUNT(*)
        AND COUNT(*) FILTER (WHERE f.total_pop_18plus > 0) = COUNT(*) AS complete,
        COUNT(f.low) = COUNT(*) AND COUNT(f.high) = COUNT(*) AS has_intervals,
        SUM(f.data_value * f.total_pop_18plus) / SUM(f.total_pop_18plus) AS value,
        -- 95% half-width of the weighted mean with fully correlated errors:
        -- sum(w_i * h_i), w_i each county's share of total_pop_18plus and h_i
        -- its half-width.
        SUM(f.total_pop_18plus * (f.high - f.low) / 2)
        / SUM(f.total_pop_18plus) AS half_width,
        ANY_VALUE(f.low) AS low,
        ANY_VALUE(f.high) AS high
    FROM filtered AS f
    INNER JOIN selected AS s ON f.year = s.year
    GROUP BY f.year, f.category, f.measure, f.data_value_unit
),

key_measures AS (
    SELECT
        measure,
        BOOL_OR(sme_highlight) AS key_indicator
    FROM {{ table }}
    GROUP BY measure
)

SELECT
    c.year AS Year,
    c.category AS Category,
    c.measure AS Measure,
    CASE WHEN c.complete THEN ROUND(c.value, 1) END AS Value,
    CASE
        WHEN c.complete AND c.has_intervals AND c.n = 1 THEN c.low
        WHEN
            c.complete AND c.has_intervals
            THEN ROUND(c.value - c.half_width, 1)
    END AS Low,
    CASE
        WHEN c.complete AND c.has_intervals AND c.n = 1 THEN c.high
        WHEN
            c.complete AND c.has_intervals
            THEN ROUND(c.value + c.half_width, 1)
    END AS High,
    c.data_value_unit AS Unit,
    COALESCE(k.key_indicator, FALSE) AS Key_Indicator
FROM combined AS c
LEFT JOIN key_measures AS k ON c.measure = k.measure
ORDER BY Category, Measure
