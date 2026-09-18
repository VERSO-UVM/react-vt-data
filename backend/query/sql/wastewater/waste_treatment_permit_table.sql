{{ cte_filter_block }}
SELECT
    i.facility_name AS "Facility Name",
    i.town AS "Town Name",
    p.PermitID AS "Permit ID",
    p.NPDESPermitNumber AS "NPDES Permit ID",
    p.PermitLink AS "Permit Link",
    p.PermitteeName AS "Permittee Name"
FROM VersoWastewater_treatmentFacilities_info AS i
INNER JOIN VersoWastewater_treatmentFacilitiesPermits_info AS p USING (facility_id)
{{ join_filter_block }}
