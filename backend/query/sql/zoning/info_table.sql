{{ cte_filter_block }}
SELECT
    i.County,
    i.Municipal_Name || ' ' || i.District_Name AS "Jurisdiction District Name",
    i.District_Type AS "District Type",
    ROUND(i.Acres, 2) AS Acres,
    c.hex_color
FROM VersoZoning_info AS i
LEFT JOIN VersoZoning_colors AS c ON i.District_Type = c.district_type
{{ join_filter_block }}
