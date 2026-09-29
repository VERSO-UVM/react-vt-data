# Historic population estimates (1791–2020) (`lake.RAW.historic_population`)

> **Status: placeholder.** The column reference has not been written yet. Follow
> the format in [zoning.md](zoning.md) when filling it in.

| Property   | Value                                                                                                                                 |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Lake table | `lake.RAW.historic_population`                                                                                                        |
| Refresh    | Static (whole-table replace)                                                                                                          |
| Source     | [VCGI historic population estimates](https://geodata.vermont.gov/datasets/84a286c51ece48488273710e1f49834e/explore) via ArcGIS Online |
| Collector  | [`backend/data_collection/historic_population.py`](../../backend/data_collection/historic_population.py)                              |
| Cleaner    | [`backend/data_cleaning/clean_historic_population.py`](../../backend/data_cleaning/clean_historic_population.py)                      |

## Columns

<!-- TODO: one row per column: Column | Type | Definition | Possible values | Non-null -->
