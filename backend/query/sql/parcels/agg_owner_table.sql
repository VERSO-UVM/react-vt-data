{{ cte_filter_block }}
SELECT
    CASE i.resident_type
        WHEN 'TOWN RESIDENT' THEN 'Town resident'
        WHEN 'VERMONT RESIDENT' THEN 'Other Vermont resident'
        WHEN 'OUT OF STATE RESIDENT' THEN 'Out-of-state resident'
        ELSE 'Corporation / entity'
    END AS "Owner Type",
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS "Share of Parcels"
FROM VCGIParcels_info AS i
{{ join_filter_block }}
WHERE i.resident_type IS NOT NULL
GROUP BY 1
ORDER BY 2 DESC
