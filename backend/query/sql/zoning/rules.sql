WITH filtered_rules AS (
    SELECT DISTINCT OBJECT_ID
    FROM zoning_rules
    {{ where_string }}
)

SELECT
    JSON_OBJECT(
        'type', 'FeatureCollection',
        'features', JSON_GROUP_ARRAY(feature)
    )::VARCHAR AS fc
FROM (
    SELECT
        JSON_OBJECT(
            'type', 'Feature',
            'geometry', ST_ASGEOJSON(ST_SIMPLIFY(g.geom, 0.0001))::JSON,
            'properties', JSON_OBJECT(
                'District Type', i.District_Type,
                'Acres', ROUND(i.Acres, 2),
                'rgba_color', c.rgba::JSON,
                'tooltip', JSON_OBJECT(
                    '__title__', 'Zoning',
                    'District', i.Municipal_Name || ' ' || i.District_Name,
                    'Type', i.District_Type,
                    'Acres', ROUND(i.Acres, 2)
                )
            )
        ) AS feature
    FROM zoning_info AS i
    INNER JOIN zoning_geom AS g USING (OBJECT_ID)
    INNER JOIN filtered_rules USING (OBJECT_ID)
    LEFT JOIN zoning_colors AS c ON i.District_Type = c.district_type
) AS features
