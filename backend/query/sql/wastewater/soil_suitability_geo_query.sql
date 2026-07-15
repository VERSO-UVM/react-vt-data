{{ cte_filter_block }}
SELECT
    json_object(
        'type', 'FeatureCollection',
        'features', json_group_array(feature)
    )::VARCHAR AS fc
FROM (
    SELECT
        json_object(
            'type', 'Feature',
            'geometry', ST_AsGeoJSON(ST_Simplify(g.geom, 0.0001))::JSON,
            'properties', json_object(
                'Suitability', i.Suitability,
                'Acres', ROUND(i.Acres, 2),
                'rgba_color', c.rgba::JSON,
                'tooltip', json_object(
                    '__title__', 'Septic Tank Soil Suitability',
                    'Jurisdiction', i.Jurisdiction || ' ' || i.RPC,
                    'Suitability Level', i.Suitability,
                    'Acres', ROUND(i.Acres, 2)
                )
            )
        ) AS feature
    FROM soil_suitability_info_soil_suit AS i
    INNER JOIN soil_suitability_geom_soil_suit AS g USING (ID)
    LEFT JOIN soil_suitability_soil_suitability_colors AS c
        ON i.Suitability = c.soil_suitability
    {{ join_filter_block }}
) AS features
