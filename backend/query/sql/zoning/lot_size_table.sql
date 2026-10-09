{{ cte_filter_block }}
SELECT
    i.county AS County,
    i.town AS Jurisdiction,
    i.town || ' ' || i.district_name AS "Jurisdiction District Name",
    i.district_type AS "District Type",
    ROUND(i.acres, 2) AS Acres,
    w.f1f_min_lot_size AS "Minimum Lot Size (ac)"
FROM VersoZoning_info AS i
INNER JOIN VersoZoning_wide AS w USING (object_id)
{{ join_filter_block }}
WHERE
    w.f1f_allowance IN ('Permitted', 'Public Hearing')
    AND w.f1f_min_lot_size IS NOT NULL
