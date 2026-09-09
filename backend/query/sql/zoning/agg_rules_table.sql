{{ cte_filter_block }}
SELECT
    r.use_type,
    r.val,
    SUM(i.Acres) AS Acres
FROM VersoZoning_rules AS r
INNER JOIN VersoZoning_info AS i USING (OBJECT_ID)
{{ join_filter_block }}
WHERE
    r.rule = 'Allowance'
    AND i.District_Type IN ('Residential', 'Mixed')
GROUP BY
    r.use_type,
    r.val
