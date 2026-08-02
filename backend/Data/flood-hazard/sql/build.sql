CREATE OR REPLACE TABLE flood AS
SELECT
    i.*,
    g.geometry AS geom
FROM info i
JOIN geom g USING (id);
