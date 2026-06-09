     SELECT json_object(
            'type', 'FeatureCollection',
            'features', json_group_array(feature)
        )::VARCHAR AS fc
        FROM (
            SELECT json_object(
                'type', 'Feature',
                'geometry', ST_AsGeoJSON(ST_Simplify(g.geom, 0.0001))::JSON,
                'properties', json_object(
                    'District Type', i.District_Type,
                    'Acres', ROUND(i.Acres, 2),
                    'rgba_color', c.rgba::JSON,            
                    'tooltip', json_object(
                        '__title__', 'Zoning',
                        'District', i.Municipal_Name || ' ' || i.District_Name,
                        'Type', i.District_Type,
                        'Acres', ROUND(i.Acres, 2)
                    )
                )
            ) AS feature
            FROM zoning_info i
            JOIN zoning_geom g USING (OBJECT_ID)
            LEFT JOIN zoning_colors c ON c.district_type = i.District_Type
            {where_string}
        )