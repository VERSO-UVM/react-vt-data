SELECT
    i.FacilityName AS "Facility Name",
    i.TownName AS "Town Name",
    p.PermitID AS "Permit ID",
    p.NPDESPermitID AS "NPDES Permit ID",
    p.PermitLink AS "Permit Link",
    p.PermitteeName AS "Permittee Name"
FROM treatment_facilities_treatment_facility_info AS i
INNER JOIN treatment_facilities_treatment_facility_permit_info AS p USING (ID)
