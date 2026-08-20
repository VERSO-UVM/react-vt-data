{{ cte_filter_block }}
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
    FROM VersoZoning_info AS i
    INNER JOIN VersoZoning_geom AS g USING (OBJECT_ID)
    LEFT JOIN VersoZoning_colors AS c ON i.District_Type = c.district_type
    {{ join_filter_block }}
) AS features
