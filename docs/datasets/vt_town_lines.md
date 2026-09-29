# Vermont town boundaries (`lake.RAW.vt_town_lines`)

> **Status: placeholder.** The column reference has not been written yet. Follow
> the format in [zoning.md](zoning.md) when filling it in.

| Property   | Value                                                                                                                             |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Lake table | `lake.RAW.vt_town_lines`                                                                                                          |
| Refresh    | Static (whole-table replace)                                                                                                      |
| Source     | [`municipalities.json`](../../backend/Data/vermont/municipalities.json), checked into this repository and fetched over raw GitHub |
| Collector  | [`backend/data_collection/fips.py`](../../backend/data_collection/fips.py)                                                        |
| Cleaner    | [`backend/data_cleaning/clean_fips.py`](../../backend/data_cleaning/clean_fips.py)                                                |

## Columns

<!-- TODO: one row per column: Column | Type | Definition | Possible values | Non-null -->
