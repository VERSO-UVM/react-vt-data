SELECT
    json_object(
        'type', 'FeatureCollection',
        'features', json_group_array(feature)
    )::VARCHAR AS fc
FROM (
    SELECT
        json_object(
            'type', 'Feature',
            'geometry', ST_AsGeoJSON(geometry)::JSON,
            'properties', json_object(
                'flood_zone_type', flood_zone_type,
                'zone_subtype', zone_subtype,
                'base_flood_elevation', base_flood_elevation,
                'flood_risk', flood_risk,
                'special_flood_hazard_zone', special_flood_hazard_zone,
                'rgba_color', rgba_color,
                'tooltip', json_object(
                    '__title__', 'FEMA Flood Hazard Zone',
                    'Flood Zone Type', flood_zone_type,
                    'Zone Subtype', zone_subtype,
                    'Flood Risk', flood_risk,
                    'Special Flood Hazard Area', special_flood_hazard_zone,
                    'Base Flood Elevation (ft)', base_flood_elevation
                )
            )
        ) AS feature
    FROM FEMA_floodHazard_geom
    {{ where_string }}
) AS features;
