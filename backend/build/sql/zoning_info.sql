CREATE OR REPLACE VIEW raw_info AS 
SELECT * REPLACE (
    CASE District_Type
        WHEN 'Primarily Residential' THEN 'Residential'
        WHEN 'Mixed with Residential' THEN 'Mixed'
        WHEN 'Nonresidential' THEN 'Nonresidential'
        WHEN 'Overlay not Affecting Use' THEN 'Overlay'
        ELSE District_Type
    END AS District_Type
)
FROM (
SELECT 
    {info_string},
    ST_Area(ST_Transform(geom, 'EPSG:4326', 'EPSG:32145', always_xy := TRUE)) / 4046.86 AS Acres
FROM zoning_raw
);