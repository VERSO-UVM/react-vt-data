# Zoning (`lake.RAW.zoning`)

Municipal zoning-district polygons for Vermont, with the housing rules each
bylaw sets for that district (allowed uses, setbacks, lot sizes, density,
parking, ADUs, PUDs). One row per district polygon.

| Property    | Value                                                                                                                        |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Lake table  | `lake.RAW.zoning`                                                                                                            |
| Rows        | 1,739 districts across 208 municipalities (snapshot of the lake built 2026-09-25)                                            |
| Columns     | 105 (104 attributes + `geometry`)                                                                                            |
| Primary key | `OBJECT_ID`                                                                                                                  |
| Refresh     | Static: the whole table is replaced on every collection run (no `year` column)                                               |
| Source      | [`VERSO-UVM/Vermont-Zoning-Atlas`](https://github.com/VERSO-UVM/Vermont-Zoning-Atlas), `data/vt-zoning-update.fgb`           |
| Collector   | [`backend/data_collection/zoning.py`](../../backend/data_collection/zoning.py)                                               |
| Cleaner     | [`backend/data_cleaning/clean_zoning.py`](../../backend/data_cleaning/clean_zoning.py) → `lake.CLEANED.VersoZoning_*` tables |

`RAW` keeps the source columns as collected. The cleaner trims, retypes, and
splits them into the `info`, `geom`, `rules`, `empty_geom`, `wide`, and `colors`
tables that downstream queries read; see the
[ETL architecture](../architecture/etl.md) for where this sits in the pipeline.

## Reading the tables below

- **Type** is the DuckDB type in the lake.
- **Possible values** lists every distinct value for columns with 14 or fewer
  (most frequent first), and the min – max range for numeric columns.
- **Non-null** is the number of rows with a value out of 1,739.
- Yes/no flags are stored as the strings `Yes` / `No`, not booleans. Counts
  (stories, parking spaces, units) are `DOUBLE`.
- A null means no value was recorded. The table does not distinguish "the bylaw
  sets no limit" from "not collected".
- Column names are case-sensitive and one contains a slash
  (`F3F_Connection_to_Sewage/Water_Required`), so quote them in SQL.
- Column groups follow the bylaw sections. `F1F`–`F4F` are the 1-, 2-, 3-, and
  4+-unit residential building types (the "family" prefixes come from the Zoning
  Atlas).

## Columns

### Identity & district attributes

| Column                      | Type           | Definition                                                                                                         | Possible values                                                                                             | Non-null       |
| --------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- | -------------- |
| `OBJECT_ID`                 | `INTEGER`      | Sequential integer identifier for each zoning district polygon across all municipalities. Unique; the primary key. | 1 – 1740 (1,739 distinct; one integer is unused)                                                            | 1,739 (100.0%) |
| `County`                    | `VARCHAR`      | Vermont county containing the district.                                                                            | 14 Vermont counties                                                                                         | 1,739 (100.0%) |
| `RPC`                       | `VARCHAR`      | Abbreviation of the Regional Planning Commission serving the municipality.                                         | `CCRPC`, `NVDA`, `TRORC`, `RRPC`, `ACRPC`, `CVRPC`, `NWRPC`, `BCRC`, `WRC`, `MARC`, `LCPC`                  | 1,739 (100.0%) |
| `Municipal_Name`            | `VARCHAR`      | Name of the municipality (town, city, or village) whose bylaw defines the district.                                | 208 distinct; trailing space on almost every value                                                          | 1,739 (100.0%) |
| `GEO_ID`                    | `VARCHAR`      | Census geographic identifier (GEOID) for the municipality, used to join to Census data. Missing for some rows.     | 10-digit string, e.g. `5000929125`                                                                          | 1,607 (92.4%)  |
| `District_Name`             | `VARCHAR`      | Full name of the district as written in the municipal bylaw.                                                       | Free text (1,026 distinct)                                                                                  | 1,739 (100.0%) |
| `Abbreviated_District_Name` | `VARCHAR`      | Short abbreviation of the district name used on maps and tables.                                                   | Free text (873 distinct)                                                                                    | 1,739 (100.0%) |
| `District_Type`             | `VARCHAR`      | Classification of the district by primary land-use character.                                                      | `Mixed with Residential`, `Primarily Residential`, `Nonresidential`, `Overlay not Affecting Use`, `Overlay` | 1,739 (100.0%) |
| `Bylaw_Date`                | `TIMESTAMP_MS` | Date of the bylaw document the district data was collected from.                                                   | 2006-10-24 – 2024-06-12                                                                                     | 1,235 (71.0%)  |
| `Elderly_Housing_District`  | `VARCHAR`      | Whether the district is designated specifically for elderly housing.                                               | `No`, `Yes`                                                                                                 | 1,736 (99.8%)  |
| `District_Mapped`           | `VARCHAR`      | Whether the district has a corresponding mapped boundary.                                                          | `Yes`, `No`                                                                                                 | 1,738 (99.9%)  |
| `Overlay_District`          | `VARCHAR`      | Whether the record is an overlay layered on top of a base district.                                                | `No`, `Yes`                                                                                                 | 1,738 (99.9%)  |
| `Base_Density`              | `DOUBLE`       | Baseline maximum residential density for the district, in units per acre.                                          | 0 – 40                                                                                                      | 408 (23.5%)    |
| `Shape_Length`              | `DOUBLE`       | Perimeter of the district polygon, inherited from the source GIS layer. See [Known quirks](#known-quirks).         | 183.4 – 544,826                                                                                             | 1,739 (100.0%) |
| `Shape_Area`                | `DOUBLE`       | Area of the district polygon, inherited from the source GIS layer. See [Known quirks](#known-quirks).              | 1,957 – 138,577,270                                                                                         | 1,739 (100.0%) |
| `geometry`                  | `BLOB (WKB)`   | District boundary. WKB-encoded `MULTIPOLYGON`, EPSG:4326 (lon/lat). Decode with `ST_GeomFromWKB(geometry)`.        | `MULTIPOLYGON` (all rows)                                                                                   | 1,739 (100.0%) |

### Single-family housing (`F1F`)

| Column                            | Type      | Definition                                                                                   | Possible values                                        | Non-null      |
| --------------------------------- | --------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ------------- |
| `F1F_Allowance`                   | `VARCHAR` | Whether single-family (1-unit) residential structures are allowed in the district.           | `Permitted`, `Prohibited`, `Public Hearing`, `Overlay` | 1,732 (99.6%) |
| `F1F_Front_Setback`               | `DOUBLE`  | Minimum setback from the front lot line for single-family (1-unit) structures, in feet.      | 0 – 300                                                | 1,035 (59.5%) |
| `F1F_Side_Setback`                | `DOUBLE`  | Minimum setback from each side lot line for single-family (1-unit) structures, in feet.      | 0 – 200                                                | 1,093 (62.9%) |
| `F1F_Rear_Setback`                | `DOUBLE`  | Minimum setback from the rear lot line for single-family (1-unit) structures, in feet.       | 0 – 410                                                | 1,085 (62.4%) |
| `F1F_Frontage`                    | `DOUBLE`  | Minimum road frontage for a single-family (1-unit) lot, in feet.                             | 0 – 1,000                                              | 883 (50.8%)   |
| `F1F_Max_Height`                  | `DOUBLE`  | Maximum height for single-family (1-unit) structures, in feet.                               | 12 – 100                                               | 1,023 (58.8%) |
| `F1F_Max_Stories`                 | `DOUBLE`  | Maximum number of stories for single-family (1-unit) structures.                             | 1 – 35                                                 | 192 (11.0%)   |
| `F1F_Min_Lot_Size`                | `DOUBLE`  | Minimum lot size for single-family (1-unit) use, in acres.                                   | 0.02 – 30                                              | 1,086 (62.4%) |
| `F1F_Max_Lot_Building_Coverage`   | `DOUBLE`  | Maximum percentage of the lot covered by building footprint for single-family (1-unit) use.  | 1 – 100                                                | 356 (20.5%)   |
| `F1F_Max_Lot_Impervious_Coverage` | `DOUBLE`  | Maximum percentage of the lot covered by impervious surfaces for single-family (1-unit) use. | 1 – 100                                                | 340 (19.6%)   |
| `F1F_Min_Parking_Spaces`          | `DOUBLE`  | Minimum off-street parking spaces per single-family (1-unit) unit.                           | 0.5 – 3                                                | 925 (53.2%)   |

### 2-unit housing (`F2F`)

| Column                               | Type      | Definition                                                                              | Possible values                                        | Non-null      |
| ------------------------------------ | --------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------ | ------------- |
| `F2F_Allowance`                      | `VARCHAR` | Whether 2-unit (duplex) residential structures are allowed in the district.             | `Permitted`, `Prohibited`, `Public Hearing`, `Overlay` | 1,732 (99.6%) |
| `F2F_Front_Setback`                  | `DOUBLE`  | Minimum setback from the front lot line for 2-unit (duplex) structures, in feet.        | 0 – 300                                                | 933 (53.7%)   |
| `F2F_Side_Setback`                   | `DOUBLE`  | Minimum setback from each side lot line for 2-unit (duplex) structures, in feet.        | 0 – 200                                                | 989 (56.9%)   |
| `F2F_Rear_Setback`                   | `DOUBLE`  | Minimum setback from the rear lot line for 2-unit (duplex) structures, in feet.         | 0 – 410                                                | 984 (56.6%)   |
| `F2F_Frontage`                       | `DOUBLE`  | Minimum road frontage for a 2-unit (duplex) lot, in feet.                               | 20 – 1,000                                             | 799 (45.9%)   |
| `F2F_Max_Density`                    | `DOUBLE`  | Maximum density for 2-unit (duplex) housing, in units per acre.                         | 0.04 – 50                                              | 535 (30.8%)   |
| `F2F_Max_Height`                     | `DOUBLE`  | Maximum height for 2-unit (duplex) structures, in feet.                                 | 3 – 90                                                 | 922 (53.0%)   |
| `F2F_Max_Stories`                    | `DOUBLE`  | Maximum number of stories for 2-unit (duplex) structures.                               | 2 – 35                                                 | 172 (9.9%)    |
| `F2F_Min_Lot_Size`                   | `DOUBLE`  | Minimum lot size for 2-unit (duplex) use, in acres.                                     | 0.02 – 50                                              | 958 (55.1%)   |
| `F2F_Max_Lot_Building_Coverage`      | `DOUBLE`  | Maximum percentage of the lot covered by building footprint for 2-unit (duplex) use.    | 1 – 200                                                | 346 (19.9%)   |
| `F2F_Max_Lot_Impervious_Coverage`    | `DOUBLE`  | Maximum percentage of the lot covered by impervious surfaces for 2-unit (duplex) use.   | 1 – 100                                                | 305 (17.5%)   |
| `F2F_Min_Parking_Spaces_per_1BR`     | `DOUBLE`  | Minimum off-street parking spaces per 1-bedroom unit in a 2-unit (duplex) building.     | 0.75 – 4                                               | 876 (50.4%)   |
| `F2F_Min_Parking_Spaces_per_mult_BR` | `DOUBLE`  | Minimum off-street parking spaces per multi-bedroom unit in a 2-unit (duplex) building. | 0.2 – 4.6                                              | 844 (48.5%)   |
| `F2F_Elderly_Housing_Only`           | `VARCHAR` | Whether 2-unit (duplex) housing in this district is restricted to elderly occupants.    | `No`, `Yes`                                            | 1,598 (91.9%) |
| `F2F_Affordable_Housing_Only`        | `VARCHAR` | Whether 2-unit (duplex) housing in this district is restricted to affordable housing.   | `No`, `Yes`                                            | 1,598 (91.9%) |

### 3-unit housing (`F3F`)

| Column                                     | Type      | Definition                                                                     | Possible values                                        | Non-null      |
| ------------------------------------------ | --------- | ------------------------------------------------------------------------------ | ------------------------------------------------------ | ------------- |
| `F3F_Allowance`                            | `VARCHAR` | Whether 3-unit residential structures are allowed in the district.             | `Prohibited`, `Public Hearing`, `Permitted`, `Overlay` | 1,733 (99.7%) |
| `F3F_Front_Setback`                        | `DOUBLE`  | Minimum setback from the front lot line for 3-unit structures, in feet.        | 0 – 300                                                | 690 (39.7%)   |
| `F3F_Side_Setback`                         | `DOUBLE`  | Minimum setback from each side lot line for 3-unit structures, in feet.        | 0 – 200                                                | 744 (42.8%)   |
| `F3F_Rear_Setback`                         | `DOUBLE`  | Minimum setback from the rear lot line for 3-unit structures, in feet.         | 0 – 410                                                | 744 (42.8%)   |
| `F3F_Frontage`                             | `DOUBLE`  | Minimum road frontage for a 3-unit lot, in feet.                               | 0 – 1,000                                              | 608 (35.0%)   |
| `F3F_Max_Density`                          | `DOUBLE`  | Maximum density for 3-unit housing, in units per acre.                         | 0.03 – 60                                              | 408 (23.5%)   |
| `F3F_Max_Height`                           | `DOUBLE`  | Maximum height for 3-unit structures, in feet.                                 | 3 – 190                                                | 712 (40.9%)   |
| `F3F_Max_Stories`                          | `DOUBLE`  | Maximum number of stories for 3-unit structures.                               | 2 – 6                                                  | 142 (8.2%)    |
| `F3F_Min_Lot_Size`                         | `DOUBLE`  | Minimum lot size for 3-unit use, in acres.                                     | 0.02 – 75                                              | 720 (41.4%)   |
| `F3F_Max_Lot_Building_Coverage`            | `DOUBLE`  | Maximum percentage of the lot covered by building footprint for 3-unit use.    | 5 – 100                                                | 281 (16.2%)   |
| `F3F_Max_Lot_Impervious_Coverage`          | `DOUBLE`  | Maximum percentage of the lot covered by impervious surfaces for 3-unit use.   | 2 – 100                                                | 265 (15.2%)   |
| `F3F_Min_Parking_Spaces_per_1BR`           | `DOUBLE`  | Minimum off-street parking spaces per 1-bedroom unit in a 3-unit building.     | 0.75 – 40                                              | 690 (39.7%)   |
| `F3F_Min_Parking_Spaces_per_mult_BR`       | `DOUBLE`  | Minimum off-street parking spaces per multi-bedroom unit in a 3-unit building. | 0.2 – 65                                               | 670 (38.5%)   |
| `F3F_Elderly_Housing_Only`                 | `VARCHAR` | Whether 3-unit housing in this district is restricted to elderly occupants.    | `No`, `Yes`                                            | 1,509 (86.8%) |
| `F3F_Affordable_Housing_Only`              | `VARCHAR` | Whether 3-unit housing in this district is restricted to affordable housing.   | `No`                                                   | 1,509 (86.8%) |
| `F3F_Proximity_to_Public_Transit_Required` | `VARCHAR` | Whether 3-unit housing requires proximity to public transit service.           | `No`, `Yes`                                            | 1,425 (81.9%) |
| `F3F_Connection_to_Sewage/Water_Required`  | `VARCHAR` | Whether 3-unit housing requires connection to public sewer or water systems.   | `No`, `Yes`                                            | 1,427 (82.1%) |

### 4+ unit housing (`F4F`)

| Column                                     | Type      | Definition                                                                                  | Possible values                                        | Non-null      |
| ------------------------------------------ | --------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ------------- |
| `F4F_Allowance`                            | `VARCHAR` | Whether 4+ unit multifamily residential structures are allowed in the district.             | `Public Hearing`, `Prohibited`, `Overlay`, `Permitted` | 1,733 (99.7%) |
| `F4F_Front_Setback`                        | `DOUBLE`  | Minimum setback from the front lot line for 4+ unit multifamily structures, in feet.        | 0 – 300                                                | 678 (39.0%)   |
| `F4F_Side_Setback`                         | `DOUBLE`  | Minimum setback from each side lot line for 4+ unit multifamily structures, in feet.        | 0 – 200                                                | 731 (42.0%)   |
| `F4F_Rear_Setback`                         | `DOUBLE`  | Minimum setback from the rear lot line for 4+ unit multifamily structures, in feet.         | 0 – 410                                                | 731 (42.0%)   |
| `F4F_Frontage`                             | `DOUBLE`  | Minimum road frontage for a 4+ unit multifamily lot, in feet.                               | 0 – 1,000                                              | 597 (34.3%)   |
| `F4F_Max_Density`                          | `DOUBLE`  | Maximum density for 4+ unit multifamily housing, in units per acre.                         | 0.04 – 80                                              | 403 (23.2%)   |
| `F4F_Max_Height`                           | `DOUBLE`  | Maximum height for 4+ unit multifamily structures, in feet.                                 | 12 – 190                                               | 700 (40.3%)   |
| `F4F_Max_Stories`                          | `DOUBLE`  | Maximum number of stories for 4+ unit multifamily structures.                               | 2 – 6                                                  | 143 (8.2%)    |
| `F4F_Min_Lot_Size`                         | `DOUBLE`  | Minimum lot size for 4+ unit multifamily use, in acres.                                     | 0.02 – 100                                             | 700 (40.3%)   |
| `F4F_Max_Lot_Building_Coverage`            | `DOUBLE`  | Maximum percentage of the lot covered by building footprint for 4+ unit multifamily use.    | 5 – 100                                                | 278 (16.0%)   |
| `F4F_Max_Lot_Impervious_Coverage`          | `DOUBLE`  | Maximum percentage of the lot covered by impervious surfaces for 4+ unit multifamily use.   | 2 – 100                                                | 263 (15.1%)   |
| `F4F_Min_Parking_Spaces_per_1BR`           | `DOUBLE`  | Minimum off-street parking spaces per 1-bedroom unit in a 4+ unit multifamily building.     | 0.75 – 9                                               | 687 (39.5%)   |
| `F4F_Min_Parking_Spaces_per_mult_BR`       | `DOUBLE`  | Minimum off-street parking spaces per multi-bedroom unit in a 4+ unit multifamily building. | 0.2 – 15                                               | 670 (38.5%)   |
| `F4F_Elderly_Housing_Only`                 | `VARCHAR` | Whether 4+ unit multifamily housing in this district is restricted to elderly occupants.    | `No`, `Yes`                                            | 1,502 (86.4%) |
| `F4F_Affordable_Housing_Only`              | `VARCHAR` | Whether 4+ unit multifamily housing in this district is restricted to affordable housing.   | `No`                                                   | 1,502 (86.4%) |
| `F4F_Proximity_to_Public_Transit_Required` | `VARCHAR` | Whether 4+ unit multifamily housing requires proximity to public transit service.           | `No`, `Yes`                                            | 1,425 (81.9%) |
| `F4F_Connection_to_Sewage/Water_Required`  | `VARCHAR` | Whether 4+ unit multifamily housing requires connection to public sewer or water systems.   | `No`, `Yes`                                            | 1,427 (82.1%) |

### Accessory dwelling units (`ADU`)

| Column                                        | Type      | Definition                                                                                                                      | Possible values                                                                                | Non-null      |
| --------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------- |
| `ADU_Allowance`                               | `VARCHAR` | Whether accessory dwelling units (ADUs) are allowed in the district.                                                            | `Allowed/Conditional`, `Prohibited`, `Not Mentioned`, `Public Hearing`, `Overlay`, `Permitted` | 1,735 (99.8%) |
| `ADU_Elderly_Housing_Only`                    | `VARCHAR` | Whether ADUs in this district are restricted to elderly occupants.                                                              | `No`, `Yes`                                                                                    | 1,581 (90.9%) |
| `ADU_Max_Size_as_Percent_of_Primary_Strcture` | `DOUBLE`  | Maximum ADU floor area as a percentage of the primary structure's floor area. (Column name is misspelled upstream: `Strcture`.) | 20 – 300                                                                                       | 1,087 (62.5%) |
| `ADU_Max_Size_in_sq_ft`                       | `DOUBLE`  | Maximum ADU floor area, in square feet.                                                                                         | 30 – 2,000                                                                                     | 741 (42.6%)   |
| `ADU_Min_Lot_Size`                            | `DOUBLE`  | Minimum lot size for a property to include an ADU, in acres.                                                                    | 0.02 – 30                                                                                      | 345 (19.8%)   |
| `ADU_Max_Bedrooms`                            | `DOUBLE`  | Maximum number of bedrooms in an ADU.                                                                                           | 1 – 2                                                                                          | 503 (28.9%)   |
| `ADU_Min_Parking_Spaces`                      | `DOUBLE`  | Minimum off-street parking spaces required for an ADU.                                                                          | 0 – 2                                                                                          | 775 (44.6%)   |
| `ADU_Owner_Occupancy_Required`                | `VARCHAR` | Whether the owner must occupy either the primary structure or the ADU.                                                          | `No`, `Yes`                                                                                    | 1,592 (91.5%) |
| `ADU_Renter_Occupancy_Prohibited`             | `VARCHAR` | Whether renting the ADU to non-family members is prohibited.                                                                    | `No`, `Yes`                                                                                    | 1,578 (90.7%) |
| `ADU_Employee_or_Family_Occupancy_Required`   | `VARCHAR` | Whether the ADU must be occupied by an employee or family member of the owner.                                                  | `No`, `Yes`                                                                                    | 1,578 (90.7%) |
| `ADU_Restricted_to_Primary_Structure`         | `VARCHAR` | Whether the ADU must be inside or attached to the primary structure rather than detached.                                       | `No`, `Yes`                                                                                    | 1,549 (89.1%) |

### Affordable housing

| Column                                              | Type      | Definition                                                                      | Possible values                                                                   | Non-null      |
| --------------------------------------------------- | --------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------- |
| `Affordable_Housing_Allowance`                      | `VARCHAR` | Whether affordable housing developments are allowed as a distinct use category. | `Not Mentioned`, `Prohibited`, `Allowed/Conditional`, `Public Hearing`, `Overlay` | 1,731 (99.5%) |
| `Affordable_Housing_District`                       | `VARCHAR` | Whether the district is specifically designated for affordable housing.         | `No`, `Yes`                                                                       | 1,736 (99.8%) |
| `Affordable_Housing_Elderly_Only`                   | `VARCHAR` | Whether affordable housing in this district is restricted to elderly residents. | `No`, `Yes`                                                                       | 1,282 (73.7%) |
| `Affordable_Housing_Min_Lot_Size`                   | `DOUBLE`  | Minimum lot size for affordable housing development, in acres.                  | 0.06 – 25                                                                         | 58 (3.3%)     |
| `Affordable_Housing_Max_Density`                    | `DOUBLE`  | Maximum density for affordable housing, in units per acre.                      | 0.2 – 46                                                                          | 37 (2.1%)     |
| `Affordable_Housing_Min_Parking_Spaces_per_mult_BR` | `DOUBLE`  | Minimum off-street parking spaces per multi-bedroom affordable unit.            | 0.98 – 3                                                                          | 122 (7.0%)    |
| `Affordable_Housing_Max_Units_per_Building`         | `DOUBLE`  | Maximum number of units per affordable housing building.                        | 2 – 4                                                                             | 16 (0.9%)     |
| `Affordable_Housing_Min_Parking_Spaces_per_1BR`     | `DOUBLE`  | Minimum off-street parking spaces per 1-bedroom affordable unit.                | 0.75 – 2.3                                                                        | 123 (7.1%)    |

### Planned residential development (`PRD`)

| Column                                 | Type      | Definition                                                                   | Possible values                                                                   | Non-null      |
| -------------------------------------- | --------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------- |
| `PRD_Allowance`                        | `VARCHAR` | Whether planned residential developments (PRDs) are allowed in the district. | `Not Mentioned`, `Public Hearing`, `Prohibited`, `Allowed/Conditional`, `Overlay` | 1,727 (99.3%) |
| `PRD_Max_Density`                      | `DOUBLE`  | Maximum PRD density, in units per acre.                                      | 0.04 – 40                                                                         | 132 (7.6%)    |
| `PRD_Max_Units`                        | `DOUBLE`  | Maximum total units in a PRD.                                                | 1 – 300                                                                           | 36 (2.1%)     |
| `PRD_Min_Lot_Size`                     | `DOUBLE`  | Minimum lot size for a PRD, in acres.                                        | 0.07 – 50                                                                         | 194 (11.2%)   |
| `PRD_Mobile_or_Manufactured_Home_Park` | `VARCHAR` | Whether the PRD provision includes mobile or manufactured home parks.        | `No`, `Yes`                                                                       | 1,460 (84.0%) |

### Planned unit development (`PUD`)

| Column                           | Type      | Definition                                                                                                                 | Possible values       | Non-null      |
| -------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------- | ------------- |
| `PUD_Allowance`                  | `VARCHAR` | Whether planned unit developments (PUDs) are allowed in the district.                                                      | `Yes`, `No`           | 1,075 (61.8%) |
| `PUD_Required_with_Subdivision`  | `VARCHAR` | Whether PUD approval is required when subdividing land in the district. Mixed encoding, see [Known quirks](#known-quirks). | `Yes`, `No`, `T`, `F` | 812 (46.7%)   |
| `PUD_Requires_Land_Conservation` | `VARCHAR` | Whether PUD approval requires setting aside land for conservation. Mixed encoding, see [Known quirks](#known-quirks).      | `Yes`, `No`, `T`, `F` | 778 (44.7%)   |
| `PUD_Threshold_Number`           | `DOUBLE`  | Number of units or lots that triggers PUD requirements.                                                                    | 0 – 9                 | 101 (5.8%)    |

### Additional information

| Column  | Type      | Definition                                                                        | Possible values                                                | Non-null       |
| ------- | --------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------- | -------------- |
| `Notes` | `VARCHAR` | Free-text notes on the district's regulations or on data-collection observations. | Free text (548 distinct); frequent leading/trailing whitespace | 1,739 (100.0%) |

## Known quirks

- **Trailing whitespace.** `Municipal_Name` has a trailing space on 1,738 of
  1,739 rows, and `Notes` has leading or trailing whitespace on 623. `TRIM()`
  before joining or comparing. The cleaner does this; `RAW` does not.
- **Mixed encodings.** `PUD_Required_with_Subdivision` and
  `PUD_Requires_Land_Conservation` mix `Yes`/`No` with `T`/`F`. Treat `T` as
  `Yes` and `F` as `No`.
- **Two allowance vocabularies.** `F1F`–`F4F` allowances use `Permitted`,
  `Prohibited`, `Public Hearing`, `Overlay`. `ADU_`, `Affordable_Housing_`, and
  `PRD_` allowances use `Allowed/Conditional` in place of `Permitted` and add
  `Not Mentioned` (`ADU_Allowance` also has 3 `Permitted` rows).
  `PUD_Allowance` is plain `Yes`/`No`.
- **`Shape_Length` / `Shape_Area` are not usable as-is.** The geometry is in
  EPSG:4326 (degrees), but these values run up to about 5.4e5 and 1.4e8, so they
  were computed in a different projection upstream and are not degrees. Compute
  area from the geometry instead (the cleaner derives `Acres` this way).
- **Missing identifiers and dates.** `GEO_ID` is null on 132 rows and
  `Bylaw_Date` on 504. `Bylaw_Date` spans 2006 to 2024, so districts in
  different towns reflect different bylaw vintages.
- **Sparse rule columns.** Most numeric rule columns are populated on well under
  half of rows (for example `Base_Density` 23%, `Affordable_Housing_Max_Density` 2%), so aggregate with the null count in mind.
- **Typo preserved from the source.** `ADU_Max_Size_as_Percent_of_Primary_Strcture`
  is misspelled upstream. It is numeric in the lake even though the Zoning Atlas
  data dictionary describes it as mixed (`No` where no limit applies).
- **Overlays.** `Overlay_District = 'Yes'` on 260 rows. `District_Type` has one
  `Overlay` row and 106 `Overlay not Affecting Use` rows.

### Columns in the Zoning Atlas data dictionary but not in `lake.RAW.zoning`

The Atlas documentation also lists `FIPS6`, `GIS_ID`, `Last_Update`,
`F1F_Max_Density`, `F1F_Elderly_Housing_Only`, and
`F1F_Affordable_Housing_Only`. They are absent from the current
`vt-zoning-update.fgb` and therefore from the lake. Do not query them.

## Example queries

```sql
-- Districts where 4+ unit housing is permitted by right, by RPC
SELECT RPC, COUNT(*) AS districts
FROM lake.RAW.zoning
WHERE F4F_Allowance = 'Permitted'
GROUP BY RPC
ORDER BY districts DESC;

-- Trim names before joining to other tables
SELECT TRIM(Municipal_Name) AS town, District_Name, F1F_Min_Lot_Size
FROM lake.RAW.zoning
WHERE TRIM(Municipal_Name) = 'Middlebury';

-- Geometry back to a spatial type
SELECT OBJECT_ID, ST_GeomFromWKB(geometry) AS geom
FROM lake.RAW.zoning;
```
