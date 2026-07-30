{{ cte_filter_block }}

SELECT
    i.CAT AS "Property Category",
    i.ACRESGL AS Acres,
    i.CITYGL AS "Owner City",
    i.TOWN AS Town,
    i.DESCPROP AS "Property Description"
FROM parcels_info AS i
 {{ join_filter_block }}
