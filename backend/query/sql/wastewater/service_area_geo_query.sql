{{cte_filter_block}}
SELECT json_object(
    'type', 'FeatureCollection',
    'features', json_group_array(feature)
)::VARCHAR AS fc
FROM (
    SELECT json_object(
        'type', 'Feature',
        'geometry', ST_AsGeoJSON(ST_Simplify(g.geometry, 0.0001))::JSON,
        'properties', json_object(
            'rgba_color', '[44, 160, 44, 180]'::JSON,
            'tooltip', json_object(
                '__title__', 'Wastewater Service Areas',
                'Regional Planning Commission', i.RPC,
                'County', i.County,
                'Town Name', i.TownName,
                'System Name', i.SystemName
            )
        )
    ) AS feature
    FROM service_areas_service_area_info AS i
    JOIN service_areas_service_area_geom AS g USING (ID)
    {{join_filter_block}}
) AS features