WITH filtered_info AS (
    SELECT DISTINCT OBJECT_ID FROM zoning_info
    {{ where_string }}
)

SELECT
    r.OBJECT_ID,
    r.use_type,
    r.rule,
    r.val
FROM zoning_rules AS r
INNER JOIN filtered_info USING (OBJECT_ID)
