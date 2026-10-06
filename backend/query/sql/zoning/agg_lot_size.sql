{{ cte_filter_block }}
SELECT
    CASE
        WHEN w.f1f_min_lot_size < 0.25 THEN 'Under 1/4 ac'
        WHEN w.f1f_min_lot_size < 0.5 THEN '1/4 to 1/2 ac'
        WHEN w.f1f_min_lot_size < 1 THEN '1/2 to 1 ac'
        WHEN w.f1f_min_lot_size < 2 THEN '1 to 2 ac'
        WHEN w.f1f_min_lot_size < 5 THEN '2 to 5 ac'
        ELSE '5+ ac'
    END AS "Minimum Lot Size",
    ROUND(100.0 * SUM(i.acres) / SUM(SUM(i.acres)) OVER (), 1) AS "Share of Acres"
FROM VersoZoning_info AS i
INNER JOIN VersoZoning_wide AS w USING (object_id)
{{ join_filter_block }}
WHERE
    w.f1f_allowance IN ('Permitted', 'Public Hearing')
    AND w.f1f_min_lot_size IS NOT NULL
GROUP BY 1
ORDER BY MIN(w.f1f_min_lot_size) -- noqa: AM06
