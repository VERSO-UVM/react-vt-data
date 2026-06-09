SELECT
    i.County AS "County",
    i.Municipal_Name || ' ' || i.District_Name AS "Jurisdiction District Name",
    i.District_Type AS "District Type",
    ROUND(i.Acres, 2) AS "Acres",
    c.hex_color AS hex_color
FROM zoning_info i 
LEFT JOIN zoning_colors c ON c.district_type = i.District_Type
{where_string}
