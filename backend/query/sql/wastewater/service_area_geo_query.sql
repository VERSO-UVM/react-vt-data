{cte_filter_block}
SELECT json_object(
    'type', 'FeatureCollection',
    'features', json_group_array(feature)
)::VARCHAR AS fc
FROM (
    SELECT json_object(
        'type', 'Feature',
        'geometry', ST_AsGeoJSON(ST_Simplify(g.geometry, 0.0001))::JSON,
        'properties', json_object(
            'tooltip', json_object(
                '__title__', 'Wastewater Service Areas',
                'Regional Planning Commission', i.RPC,
                'County', i.County
                'District', i.TownName || ' ' || i.MunicipalName,
                'System Name', i.SystemName
            )
        )
    ) AS feature
    FROM service_areas_service_area_info AS i
    JOIN service_areas_service_area_geom AS g USING (ID)
    {join_filter_block}
)