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
                'District Type', i.district_type,
                'Acres', ROUND(i.acres, 2),
                'rgba_color', c.rgba::JSON,
                'tooltip', JSON_OBJECT(
                    '__title__', 'Zoning',
                    'Jurisdiction', i.town,
                    'District', i.district_name,
                    'Type', i.district_type,
                    'Acres', ROUND(i.acres, 2)
                )
            )
        ) AS feature
    FROM VersoZoning_info AS i
    INNER JOIN VersoZoning_geom AS g USING (object_id)
    LEFT JOIN VersoZoning_colors AS c ON i.district_type = c.district_type
    {{ join_filter_block }}
) AS features
