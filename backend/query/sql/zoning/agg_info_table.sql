SELECT 
    i.District_Type        AS "District Type",
    SUM(i.Acres)           AS "Acres",
    any_value(c.hex_color) AS hex_color,
FROM zoning_info i
LEFT JOIN zoning_colors c ON c.district_type = i.DIstrict_Type
{where_string}
GROUP BY i.District_Type