{{ cte_filter_block }}
SELECT
    i.District_Type AS "District Type",
    SUM(i.Acres) AS Acres,
    ANY_VALUE(c.hex_color) AS hex_color
FROM zoning_info AS i
LEFT JOIN zoning_colors AS c ON i.District_Type = c.district_type
{{ join_filter_block }}
GROUP BY i.District_Type
