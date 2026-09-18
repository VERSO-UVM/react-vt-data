{{ cte_filter_block }},

filtered AS (
    SELECT
        g.county,
        g.town,
        i.category,
        i.address,
        ROUND(i.acres, 2) AS acres,
        i.vacant_land,
        i.city,
        i.state,
        i.owner_1,
        i.owner_2,
        i.out_of_state_owner,
        t.listed_real_value,
        ROUND(t.value_per_acre, 2) AS value_per_acre,
        g.geometry
    FROM VCGIParcels_geom AS g
    INNER JOIN VCGIParcels_info AS i USING (object_id)
    LEFT JOIN VCGIParcels_tax AS t USING (object_id)
    {{ join_filter_block }}
),

features AS (
    SELECT
        JSON_OBJECT(
            'type', 'Feature',
            'geometry', ST_ASGEOJSON(ST_SIMPLIFY(geometry, 0.0001))::JSON,
            'properties', JSON_OBJECT(
                'County', county,
                'Jurisdiction', town,
                'Category', category,
                'Acres', acres,
                'Vacant Land', vacant_land,
                'Assessed Value', listed_real_value,
                'Value Per Acre', value_per_acre,
                'tooltip', JSON_OBJECT(
                    '__title__', 'Parcel',
                    'Jurisdiction', town,
                    'County', county,
                    'Address', address,
                    'Category', category,
                    'Acres', acres,
                    'Vacant Land', vacant_land,
                    'Assessed Value', listed_real_value,
                    'Value Per Acre', value_per_acre,
                    'Primary Owner', owner_1,
                    'Secondary Owner', owner_2,
                    'Mailing City', city,
                    'Mailing State', state,
                    'Out-of-State Owner', out_of_state_owner
                )
            )
        ) AS feature
    FROM filtered
)

SELECT JSON_OBJECT(
    'type', 'FeatureCollection',
    'features', (SELECT JSON_GROUP_ARRAY(feature) FROM features)
)::VARCHAR AS result;
