# Housing (ACS-5 B-tables) (`lake.RAW.housing`)

> **Status: placeholder.** The column reference has not been written yet. Follow
> the format in [zoning.md](zoning.md) when filling it in.

| Property   | Value                                                                                                                   |
| ---------- | ----------------------------------------------------------------------------------------------------------------------- |
| Lake table | `lake.RAW.housing`                                                                                                      |
| Refresh    | Yearly (one set of rows per ACS vintage)                                                                                |
| Source     | U.S. Census Bureau ACS 5-Year via the [Census API](https://api.census.gov/data/), tables B25001, B25003, B25004, B25077 |
| Collector  | [`backend/data_collection/housing.py`](../../backend/data_collection/housing.py)                                        |
| Cleaner    | [`backend/data_cleaning/clean_acs5_timeseries.py`](../../backend/data_cleaning/clean_acs5_timeseries.py)                |

## Columns

<!-- TODO: one row per column: Column | Type | Definition | Possible values | Non-null -->
