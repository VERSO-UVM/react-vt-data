{{ cte_filter_block }}
SELECT
    r.use_type,
    r.val,
    SUM(i.acres) AS Acres
FROM VersoZoning_rules AS r
INNER JOIN VersoZoning_info AS i USING (object_id)
{{ join_filter_block }}
WHERE
    r.rule = 'Allowance'
    AND i.district_type IN ('Residential', 'Mixed')
GROUP BY
    r.use_type,
    r.val
