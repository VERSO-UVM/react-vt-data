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
                'Parcel Type', i.CAT,
                'Acres', ROUND(i.ACRESGL, 2),
                'rgba_color', '[100,150,200,150]'::JSON,
                'tooltip', JSON_OBJECT(
                    '__title__', 'Parcels',
                    'Place', i.CITYGL,
                    'Parcel Description', i.DESCPROP,
                    'Acres', ROUND(i.ACRESGL, 2)
                )
            )
        ) AS feature
    FROM parcels_info AS i
    INNER JOIN parcels_geom AS g USING (OBJECTID)
    {{ join_filter_block }}
) AS features

