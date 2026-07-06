SELECT 
    r.use_type,
    r.val,
    SUM(i.Acres) AS Acres
FROM main.zoning_rules AS r
JOIN main.zoning_info AS i USING (OBJECT_ID)
{{ where_string }} 
AND r.rule = 'Allowance' AND i.District_Type IN ('Residential', 'Mixed')
GROUP BY 
    r.use_type,
    r.val
