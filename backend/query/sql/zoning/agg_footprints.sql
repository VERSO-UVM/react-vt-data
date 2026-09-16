{{ cte_filter_block }}
SELECT COUNT(*) AS "Building Footprints"
FROM VCGI_buildingFootprints_geom
{{ join_filter_block }}
