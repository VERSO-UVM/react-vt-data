{{ cte_filter_block }}
SELECT
    i.county AS County,
    i.town AS Jurisdiction,
    CASE i.resident_type
        WHEN 'TOWN RESIDENT' THEN 'Town resident'
        WHEN 'VERMONT RESIDENT' THEN 'Other Vermont resident'
        WHEN 'OUT OF STATE RESIDENT' THEN 'Out-of-state resident'
        ELSE 'Corporation / entity'
    END AS "Owner Type",
    COUNT(*) AS Parcels,
    ROUND(SUM(i.acres), 2) AS Acres
FROM VCGIParcels_info AS i
{{ join_filter_block }}
WHERE i.resident_type IS NOT NULL
GROUP BY 1, 2, 3
ORDER BY 1, 2, 4 DESC
