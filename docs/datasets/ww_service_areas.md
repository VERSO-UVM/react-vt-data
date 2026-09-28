# Wastewater service areas (`lake.RAW.ww_service_areas`)

> **Status: placeholder.** The column reference has not been written yet. Follow
> the format in [zoning.md](zoning.md) when filling it in.

| Property   | Value                                                                                                                                                |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lake table | `lake.RAW.ww_service_areas`                                                                                                                          |
| Refresh    | Static (whole-table replace)                                                                                                                         |
| Source     | [VERSO Wastewater Infrastructure Mapping](https://verso-uvm.github.io/Wastewater-Infrastructure-Mapping/data.html) (`Vermont_Service_Areas.geojson`) |
| Collector  | [`backend/data_collection/wastewater.py`](../../backend/data_collection/wastewater.py)                                                               |
| Cleaner    | [`backend/data_cleaning/clean_wastewater.py`](../../backend/data_cleaning/clean_wastewater.py)                                                       |

## Columns

<!-- TODO: one row per column: Column | Type | Definition | Possible values | Non-null -->
