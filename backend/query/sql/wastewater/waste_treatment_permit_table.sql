SELECT
    i.FacilityName AS "Facility Name",
    i.TownName AS "Town Name",
    p.PermitID AS "Permit ID",
    p.NPDESPermitID AS "NPDES Permit ID",
    p.PermitLink AS "Permit Link",
    p.PermitteeName AS "Permittee Name"
FROM VersoWastewater_treatmentFacilities_info AS i
INNER JOIN VersoWastewater_treatmentFacilitiesPermits_info AS p USING (ID)
