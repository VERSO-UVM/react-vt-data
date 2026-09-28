# FEMA flood hazard areas (`lake.RAW.flood`)

> **Status: placeholder.** The column reference has not been written yet. Follow
> the format in [zoning.md](zoning.md) when filling it in.

| Property   | Value                                                                                                                                                                                     |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lake table | `lake.RAW.flood`                                                                                                                                                                          |
| Refresh    | Static (whole-table replace)                                                                                                                                                              |
| Source     | [VT ANR / FEMA digitized flood hazard areas](https://geodata.vermont.gov/datasets/VTANR::flood-hazard-areas-only-fema-digitized-data), ArcGIS REST MapServer layer 57 (paginated GeoJSON) |
| Collector  | [`backend/data_collection/flood.py`](../../backend/data_collection/flood.py)                                                                                                              |
| Cleaner    | [`backend/data_cleaning/clean_flood.py`](../../backend/data_cleaning/clean_flood.py)                                                                                                      |

## Columns

<!-- TODO: one row per column: Column | Type | Definition | Possible values | Non-null -->
