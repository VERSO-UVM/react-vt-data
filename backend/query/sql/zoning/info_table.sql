{{ cte_filter_block }}
SELECT
    i.county AS County,
    i.town AS Jurisdiction,
    i.town || ' ' || i.district_name AS "Jurisdiction District Name",
    i.district_type AS "District Type",
    ROUND(i.acres, 2) AS Acres,
    c.hex_color
FROM VersoZoning_info AS i
LEFT JOIN VersoZoning_colors AS c ON i.district_type = c.district_type
{{ join_filter_block }}
