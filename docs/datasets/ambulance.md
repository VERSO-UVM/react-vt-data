# Ambulance service areas (`lake.RAW.ambulance`)

> **Status: placeholder.** The column reference has not been written yet. Follow
> the format in [zoning.md](zoning.md) when filling it in.

| Property   | Value                                                                                               |
| ---------- | --------------------------------------------------------------------------------------------------- |
| Lake table | `lake.RAW.ambulance`                                                                                |
| Refresh    | Static (whole-table replace)                                                                        |
| Source     | [VCGI](https://vcgi.vermont.gov/) Emergency Ambulance Service Areas, ArcGIS FeatureServer (GeoJSON) |
| Collector  | [`backend/data_collection/ambulance.py`](../../backend/data_collection/ambulance.py)                |
| Cleaner    | [`backend/data_cleaning/clean_ambulance.py`](../../backend/data_cleaning/clean_ambulance.py)        |

## Columns

<!-- TODO: one row per column: Column | Type | Definition | Possible values | Non-null -->
