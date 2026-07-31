WITH filtered_info AS (
    SELECT
        OBJECT_ID,
        Acres,
        District_Type
    FROM zoning_info
    {{ where_string }}
)

SELECT
    r.use_type,
    r.val,
    SUM(i.Acres) AS Acres
FROM zoning_rules AS r
INNER JOIN filtered_info AS i USING (OBJECT_ID)
WHERE r.rule = 'Allowance' AND i.District_Type IN ('Residential', 'Mixed')
GROUP BY
    r.use_type,
    r.val
