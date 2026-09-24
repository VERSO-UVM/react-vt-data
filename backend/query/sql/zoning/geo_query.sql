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

-- Areas come from ST_Union_Agg, not summed per-district acres, so overlay
-- districts sitting on top of base districts aren't counted twice. Unions are
-- per town (cheaper than per county); county figures sum their towns, which
-- matches a county-wide union to within 0.1% since towns don't overlap.
matched_area AS (
    SELECT
        county,
        town,
        ST_Area_Spheroid(ST_Union_Agg(geometry)) / 4046.8564224 AS matched_acres
    FROM filtered
    GROUP BY county, town
),

district_area AS (
    SELECT
        district_type,
        ST_Area_Spheroid(ST_Union_Agg(geometry)) / 4046.8564224 AS acres
    FROM filtered
    GROUP BY district_type
),

town_area AS (
    SELECT
        i.county,
        i.town,
        ST_Area_Spheroid(ST_Union_Agg(g.geometry)) / 4046.8564224 AS total_acres
    FROM VersoZoning_info AS i
    INNER JOIN VersoZoning_geom AS g USING (object_id)
    GROUP BY i.county, i.town
),

town_totals AS (
    SELECT
        t.county,
        t.town,
        COALESCE(m.matched_acres, 0) AS matched_acres,
        t.total_acres
    FROM town_area AS t
    LEFT JOIN matched_area AS m USING (county, town)
),

county_totals AS (
    SELECT
        county,
        SUM(matched_acres) AS matched_acres,
        SUM(total_acres) AS total_acres
    FROM town_totals
    GROUP BY county
),

stats AS (
    SELECT
        JSON_GROUP_ARRAY(JSON_OBJECT(
            'county', county,
            'matched_acres', ROUND(matched_acres, 2),
            'total_acres', ROUND(total_acres, 2),
            'pct', ROUND(100 * matched_acres / NULLIF(total_acres, 0), 2)
        )) AS arr
    FROM county_totals
),

town_stats AS (
    SELECT
        JSON_GROUP_ARRAY(JSON_OBJECT(
            'town', town,
            'county', county,
            'matched_acres', ROUND(matched_acres, 2),
            'total_acres', ROUND(total_acres, 2),
            'pct', ROUND(100 * matched_acres / NULLIF(total_acres, 0), 2)
        )) AS arr
    FROM town_totals
),

district_stats AS (
    SELECT
        JSON_GROUP_ARRAY(JSON_OBJECT(
            'district_type', district_type,
            'acres', ROUND(acres, 2)
        )) AS arr
    FROM district_area
)

SELECT JSON_OBJECT(
    'geojson', JSON_OBJECT(
        'type', 'FeatureCollection',
        'features', (SELECT JSON_GROUP_ARRAY(feature) FROM features)
    ),
    'stats', (SELECT arr FROM stats),
    'town_stats', (SELECT arr FROM town_stats),
    'district_stats', (SELECT arr FROM district_stats)
)::VARCHAR AS result;
