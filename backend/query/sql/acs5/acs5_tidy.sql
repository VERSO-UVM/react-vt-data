-- Every column, so the margin columns come along where the warehouse has
-- them; get_acs5_tidy keeps and renames the fields the frontend reads.
SELECT *
FROM {{ table }}
{{ where_string }}
ORDER BY year, section, variable
