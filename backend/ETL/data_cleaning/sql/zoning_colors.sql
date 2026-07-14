CREATE OR REPLACE TABLE colors (
    district_type TEXT PRIMARY KEY,
    hex_color TEXT NOT NULL,
    rgba TEXT NOT NULL
);

INSERT INTO colors VALUES
('Residential', '#1f77b4', '[31,119,180,180]'),
('Mixed', '#ff7f0e', '[255,127,14,180]'),
('Nonresidential', '#2ca02c', '[44,160,44,180]'),
('Overlay', '#d62728', '[214,39,40,180]');
