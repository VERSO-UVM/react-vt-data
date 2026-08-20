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
                'Septage Received At Facility', i.SeptageReceivedAtThisFacility,
                'Design Hydraulic Capacity', i.DesignHydraulicCapacityInMGD,
                'tooltip', json_object(
                    '__title__', 'Wastewater Treatment Facilities',
                    'Regional Planning Commission', i.RPC,
                    'County', i.County,
                    'Town Name', i.TownName,
                    'Facility Name', i.FacilityName,
                    'Septage Received At Facility', i.SeptageReceivedAtThisFacility,
                    'Design Hydraulic Capacity', i.DesignHydraulicCapacityInMGD
                )
            )
        ) AS feature
    FROM VersoWastewater_treatmentFacilities_info AS i
    INNER JOIN VersoWastewater_treatmentFacilities_geom AS g USING (ID)
    {{ join_filter_block }}
) AS features
