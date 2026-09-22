{{ cte_filter_block }},

filtered AS (
    SELECT
        i.county,
        i.district_type,
        ROUND(i.acres, 2) AS acres,
        i.town,
        i.district_name,
        c.rgba,
        g.geometry
    FROM VersoZoning_info AS i
    INNER JOIN VersoZoning_geom AS g USING (object_id)
    LEFT JOIN VersoZoning_colors AS c ON i.district_type = c.district_type
    {{ join_filter_block }}
),

features AS (
    SELECT
        JSON_OBJECT(
            'type', 'Feature',
            'geometry', ST_ASGEOJSON(ST_SIMPLIFY(geometry, 0.0001))::JSON,
            'properties', JSON_OBJECT(
                'District Type', district_type,
                'District Name', district_name,
                'Acres', acres,
                'rgba_color', rgba::JSON,
                'county', county,
                'tooltip', JSON_OBJECT(
                    '__title__', 'Zoning',
                    'County', county,
                    'Jurisdiction', town,
                    'District', district_name,
                    'Type', district_type,
                    'Acres', acres
                )
            )
        ) AS feature
    FROM filtered
),

matched_area AS (
    SELECT
        county,
        ST_Area_Spheroid(ST_Union_Agg(geometry)) / 4046.8564224 AS matched_acres
    FROM filtered
    GROUP BY county
),

county_area AS (
    SELECT
        i.county,
        ST_Area_Spheroid(ST_Union_Agg(g.geometry)) / 4046.8564224 AS total_acres
    FROM VersoZoning_info AS i
    INNER JOIN VersoZoning_geom AS g USING (object_id)
    GROUP BY i.county
),

stats AS (
    SELECT
        JSON_GROUP_ARRAY(JSON_OBJECT(
            'county', t.county,
            'matched_acres', ROUND(COALESCE(m.matched_acres, 0), 2),
            'total_acres', ROUND(t.total_acres, 2),
            'pct',
            ROUND(100 * COALESCE(m.matched_acres, 0) / NULLIF(t.total_acres, 0), 2)
        )) AS arr
    FROM county_area AS t
    LEFT JOIN matched_area AS m USING (county)
)

SELECT JSON_OBJECT(
    'geojson', JSON_OBJECT(
        'type', 'FeatureCollection',
        'features', (SELECT JSON_GROUP_ARRAY(feature) FROM features)
    ),
    'stats', (SELECT arr FROM stats)
)::VARCHAR AS result;
