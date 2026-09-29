# CDC PLACES, census tract (`lake.RAW.cdc_places_tract`)

> **Status: placeholder.** The column reference has not been written yet. Follow
> the format in [zoning.md](zoning.md) when filling it in.

| Property   | Value                                                                                                        |
| ---------- | ------------------------------------------------------------------------------------------------------------ |
| Lake table | `lake.RAW.cdc_places_tract`                                                                                  |
| Refresh    | Static (whole-table replace)                                                                                 |
| Source     | [CDC PLACES](https://data.cdc.gov/) local health data, census-tract release (SODA API, resource `cwsq-ngmh`) |
| Collector  | [`backend/data_collection/cdc.py`](../../backend/data_collection/cdc.py)                                     |
| Cleaner    | [`backend/data_cleaning/clean_cdc.py`](../../backend/data_cleaning/clean_cdc.py)                             |

## Columns

<!-- TODO: one row per column: Column | Type | Definition | Possible values | Non-null -->
