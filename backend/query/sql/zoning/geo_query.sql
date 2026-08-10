{{ cte_filter_block }},

filtered AS (
    SELECT
        i.County,
        i.District_Type,
        ROUND(i.Acres, 2) AS Acres,
        i.Municipal_Name,
        i.District_Name,
        c.rgba,
        g.geom
    FROM zoning_info AS i
    INNER JOIN zoning_geom AS g USING (OBJECT_ID)
    LEFT JOIN zoning_colors AS c ON i.District_Type = c.district_type
    {{ join_filter_block }}
),

features AS (
    SELECT
        JSON_OBJECT(
            'type', 'Feature',
            'geometry', ST_ASGEOJSON(ST_SIMPLIFY(geom, 0.0001))::JSON,
            'properties', JSON_OBJECT(
                'District Type', District_Type,
                'Acres', Acres,
                'rgba_color', rgba::JSON,
                'county', County,
                'tooltip', JSON_OBJECT(
                    '__title__', 'Zoning',
                    'County', County,
                    'District', Municipal_Name || ' ' || District_Name,
                    'Type', District_Type,
                    'Acres', Acres
                )
            )
        ) AS feature
    FROM filtered
),

matched_area AS (
    SELECT
        County,
        ST_Area_Spheroid(ST_Union_Agg(geom)) / 4046.8564224 AS matched_acres
    FROM filtered
    GROUP BY County
),

county_area AS (
    SELECT
        i.County,
        ST_Area_Spheroid(ST_Union_Agg(g.geom)) / 4046.8564224 AS total_acres
    FROM zoning_info AS i
    INNER JOIN zoning_geom AS g USING (OBJECT_ID)
    GROUP BY i.County
),

stats AS (
    SELECT
        JSON_GROUP_ARRAY(JSON_OBJECT(
            'county', t.County,
            'matched_acres', ROUND(COALESCE(m.matched_acres, 0), 2),
            'total_acres', ROUND(t.total_acres, 2),
            'pct',
            ROUND(100 * COALESCE(m.matched_acres, 0) / NULLIF(t.total_acres, 0), 2)
        )) AS arr
    FROM county_area AS t
    LEFT JOIN matched_area AS m USING (County)
)

SELECT JSON_OBJECT(
    'geojson', JSON_OBJECT(
        'type', 'FeatureCollection',
        'features', (SELECT JSON_GROUP_ARRAY(feature) FROM features)
    ),
    'stats', (SELECT arr FROM stats)
)::VARCHAR AS result;
