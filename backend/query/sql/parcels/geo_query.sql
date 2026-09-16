{{ cte_filter_block }},

filtered AS (
    SELECT
        g.COUNTY,
        g.TOWN,
        i.CATEGORY,
        i.ADDRESS,
        ROUND(i.ACRESGL, 2) AS Acres,
        i.VACANTLAND,
        i.TNAME,
        i.CITYGL,
        i.STGL,
        i.OWNER1,
        i.OWNER2,
        i.OOSOWNER,
        t.REAL_FLV,
        ROUND(t.ACREVALUE, 2) AS ACREVALUE,
        g.geometry
    FROM VCGIParcels_geom AS g
    INNER JOIN VCGIParcels_info AS i USING (OBJECTID)
    LEFT JOIN VCGIParcels_tax AS t USING (OBJECTID)
    {{ join_filter_block }}
),

features AS (
    SELECT
        JSON_OBJECT(
            'type', 'Feature',
            'geometry', ST_ASGEOJSON(ST_SIMPLIFY(geometry, 0.0001))::JSON,
            'properties', JSON_OBJECT(
                'County', COUNTY,
                'Jurisdiction', TOWN,
                'Category', CATEGORY,
                'Acres', Acres,
                'Vacant Land', VACANTLAND,
                'Assessed Value', REAL_FLV,
                'Value Per Acre', ACREVALUE,
                'tooltip', JSON_OBJECT(
                    '__title__', 'Parcel',
                    'Jurisdiction', TOWN,
                    'County', COUNTY,
                    'Address', ADDRESS,
                    'Category', CATEGORY,
                    'Acres', Acres,
                    'Vacant Land', VACANTLAND,
                    'Assessed Value', REAL_FLV,
                    'Value Per Acre', ACREVALUE,
                    'Primary Owner', OWNER1,
                    'Secondary Owner', OWNER2,
                    'Mailing City', CITYGL,
                    'Mailing State', STGL,
                    'Out-of-State Owner', OOSOWNER
                )
            )
        ) AS feature
    FROM filtered
)

SELECT JSON_OBJECT(
    'type', 'FeatureCollection',
    'features', (SELECT JSON_GROUP_ARRAY(feature) FROM features)
)::VARCHAR AS result;
