{{ cte_filter_block }}

SELECT
    i.county AS County,
    i.town AS Jurisdiction,
    CASE
        WHEN
            i.category LIKE 'Residential%' OR i.category LIKE 'Mobile Home%'
            THEN 'Residential'
        WHEN i.category LIKE 'Seasonal%' THEN 'Seasonal'
        WHEN i.category LIKE 'Commercial%' THEN 'Commercial'
        WHEN i.category LIKE 'Utility%' THEN 'Utility'
        WHEN i.category IN ('Farm', 'Woodland', 'Industrial') THEN i.category
        ELSE 'Other'
    END AS "Land Use",
    COUNT(*) AS Parcels,
    ROUND(SUM(i.acres), 2) AS Acres
FROM VCGIParcels_info AS i
{{ join_filter_block }}
WHERE i.category IS NOT NULL
GROUP BY 1, 2, 3
ORDER BY 1, 2, 5 DESC
