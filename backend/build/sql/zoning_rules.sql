CREATE OR REPLACE VIEW raw_rules AS
SELECT OBJECT_ID, col_name, val
FROM zoning_raw
UNPIVOT (val FOR col_name IN ({rule_string}))