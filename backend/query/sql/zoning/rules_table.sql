{{ cte_filter_block }}
SELECT
    r.OBJECT_ID,
    r.use_type,
    r.rule,
    r.val
FROM VersoZoning_rules AS r
{{ join_filter_block }}
