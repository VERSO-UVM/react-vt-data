SELECT
    i.County,
    i.Municipal_Name || ' ' || i.District_Name AS "Jurisdiction District Name",
    i.District_Type AS "District Type",
    ROUND(i.Acres, 2) AS Acres,
    c.hex_color
FROM zoning_info AS i
LEFT JOIN zoning_colors AS c ON i.District_Type = c.district_type
{{ where_string }}
