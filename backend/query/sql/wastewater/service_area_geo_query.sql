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
    FROM VersoWastewater_serviceAreas_info AS i
    INNER JOIN VersoWastewater_serviceAreas_geom AS g USING (Area_ID)
    {{ join_filter_block }}
) AS features
