{{ cte_filter_block }}
SELECT
    i.district_type AS "District Type",
    SUM(i.acres) AS Acres,
    ANY_VALUE(c.hex_color) AS hex_color
FROM VersoZoning_info AS i
LEFT JOIN VersoZoning_colors AS c ON i.district_type = c.district_type
{{ join_filter_block }}
GROUP BY i.district_type
