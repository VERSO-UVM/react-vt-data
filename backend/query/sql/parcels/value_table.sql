{{ cte_filter_block }}
SELECT
    i.county AS County,
    i.town AS Jurisdiction,
    CASE
        WHEN i.category = 'Residential I (Under 6 Acres)' THEN 'Residential (<6 ac)'
        WHEN i.category = 'Residential II (6 Acres or More)' THEN 'Residential (6+ ac)'
        WHEN i.category = 'Seasonal I (Under 6 Acres)' THEN 'Seasonal (<6 ac)'
        WHEN i.category = 'Seasonal II (6 Acres or More)' THEN 'Seasonal (6+ ac)'
        WHEN i.category LIKE 'Commercial%' THEN 'Commercial'
        WHEN i.category = 'Mobile Home Landed (With Land)' THEN 'Mobile Home'
        WHEN i.category IN ('Farm', 'Woodland', 'Industrial') THEN i.category
        ELSE 'Other'
    END AS "Land Use",
    COUNT(*) AS Parcels,
    ROUND(MEDIAN(t.value_per_acre)) AS "Value Per Acre"
FROM VCGIParcels_info AS i
INNER JOIN VCGIParcels_tax AS t USING (object_id)
{{ join_filter_block }}
WHERE
    i.category IS NOT NULL
    AND i.category <> 'Mobile Home Unlanded (Without Land)'
    AND i.acres > 0
    AND t.value_per_acre > 0
GROUP BY 1, 2, 3
ORDER BY 1, 2, 5 DESC
