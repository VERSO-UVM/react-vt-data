{{ cte_filter_block }}
SELECT
    json_object(
        'type', 'FeatureCollection',
        'features', json_group_array(feature)
    )::VARCHAR AS fc
FROM (
    SELECT
        json_object(
            'type', 'Feature',
            'geometry', ST_AsGeoJSON(ST_Simplify(g.geometry, 0.0001))::JSON,
            'properties', json_object(
                'Septage Received At Facility', i.septage_received,
                'Design Hydraulic Capacity', i.design_hydraulic_capacity_mgd,
                'tooltip', json_object(
                    '__title__', 'Wastewater Treatment Facilities',
                    'Regional Planning Commission', i.rpc,
                    'County', i.county,
                    'Town Name', i.town,
                    'Facility Name', i.facility_name,
                    'Septage Received At Facility', i.septage_received,
                    'Design Hydraulic Capacity', i.design_hydraulic_capacity_mgd
                )
            )
        ) AS feature
    FROM VersoWastewater_treatmentFacilities_info AS i
    INNER JOIN VersoWastewater_treatmentFacilities_geom AS g USING (facility_id)
    {{ join_filter_block }}
) AS features
