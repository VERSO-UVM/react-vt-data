SELECT
    i.FacilityName AS "Facility Name"
    i.TownName AS "Town Name",
    p.PermitID AS "Permit ID",
    p.NPDESPermitID as "NPDES Permit ID"
    p.PermitLink as "Permit Link"
    p.PermitteeName as "Permittee Name"
FROM wastewater_treatment_facilities_treatment_facility_info AS i
JOIN wastewater_treatment_facilities_treatment_facility_permit_info AS g USING (ID)