SELECT
    json_object(
        'type', 'FeatureCollection',
        'features', json_group_array(feature)
    )::VARCHAR AS fc
FROM (
    SELECT
        json_object(
            'type', 'Feature',
            'geometry',
                ST_AsGeoJSON(
                    ST_Simplify(g.geometry, 0.0001)
                )::JSON,
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
    FROM VersoWastewater_soilSuitability_info AS i
    INNER JOIN VersoWastewater_soilSuitability_geom AS g
        ON i.OGC_FID = g.OGC_FID
    LEFT JOIN VersoWastewater_soilSuitability_colors AS c
        ON i.Suitability = c.soil_suitability
    {{ where_string }}
) AS features;