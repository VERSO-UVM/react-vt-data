# DuckDB Consolidation Report

_Which data streams make sense to consolidate to DuckDB._

---

## Current State

DuckDB is **already used** in two routes:

| Route file        | Data                                        | DuckDB operations                                  |
| ----------------- | ------------------------------------------- | -------------------------------------------------- |
| `post_acs5_db.py` | 9 tidy parquets (ACS5 B-series + DP-series) | 9 views, WHERE + ORDER, UNION ALL across DP tables |
| `post_qcew.py`    | `vt_qcew_employment.parquet` (53 KB)        | WHERE county, PIVOT sectors, ORDER year/quarter    |

These are the right pattern. Everything else either uses the `masterload()` Geopandas pipeline (FGB/GeoJSON) or loads individual CSVs with pandas in `post_census.py`.

---

## Data Inventory

### Census (`backend/Data/Census/`)

| File                                     | Format     | Size            | Currently used by                                          |
| ---------------------------------------- | ---------- | --------------- | ---------------------------------------------------------- |
| `vt_acs5_combined.csv`                   | CSV        | 101 MB          | Not used by any active route                               |
| `vt_acs5_combined.parquet`               | Parquet    | 15 MB           | Not used by any active route                               |
| `vt_acs5_combined_TIDY.parquet`          | Parquet    | 9.4 MB          | `post_acs5_db.py` (DuckDB view `profile_census`)           |
| `vt_acs5_b_demographics_tidy.parquet`    | Parquet    | 274 KB          | `post_acs5_db.py` (DuckDB view `b10_census`)               |
| `vt_acs5_b_education_tidy.parquet`       | Parquet    | 94 KB           | `post_acs5_db.py` (DuckDB view `b15003_education`)         |
| `vt_acs5_b_housing_tidy.parquet`         | Parquet    | 105 KB          | `post_acs5_db.py` (DuckDB view `b_housing`)                |
| `vt_acs5_b_economic_tidy.parquet`        | Parquet    | 102 KB          | `post_acs5_db.py` (DuckDB view `b_economic`)               |
| `vt_acs5_{topic}_data_tidy.parquet` (×4) | Parquet    | 1–2.2 MB each   | `post_acs5_db.py` (DuckDB views `dp02`–`dp05`)             |
| `vt_acs5_{topic}_data.csv` (×4)          | CSV        | 8–15 MB each    | Not used by any active route (superseded by tidy parquets) |
| `vt_acs5_{topic}_data_tidy.csv` (×4)     | CSV        | 100–200 MB each | Not used by any active route                               |
| `VT_{topic}_ALL.fgb` (×4)                | FlatGeobuf | 600–900 KB each | `post_census.py` via `masterload()` + Geopandas            |
| `VT_HOUSING_ALL_2013.fgb`                | FlatGeobuf | 852 KB          | `post_census.py` (2013 snapshot comparison)                |
| `VT_Historic_Population.csv`             | CSV        | 425 KB          | `post_census.py` via pandas                                |
| `unemployment_rate_by_year.csv`          | CSV        | 200 KB          | `post_census.py` via pandas                                |
| `median_earnings_by_year.csv`            | CSV        | 717 KB          | `post_census.py` via pandas                                |
| `med_home_value_by_year.csv`             | CSV        | 242 KB          | `post_census.py` via pandas                                |
| `med_smoc_by_year.csv`                   | CSV        | 593 KB          | `post_census.py` via pandas                                |
| `commute_time_by_year.csv`               | CSV        | 203 KB          | `post_census.py` via pandas                                |
| `commute_habits_by_year.csv`             | CSV        | 707 KB          | `post_census.py` via pandas                                |

### Non-Census

| File                         | Format     | Size                        | Currently used by                               |
| ---------------------------- | ---------- | --------------------------- | ----------------------------------------------- |
| `vt_qcew_employment.parquet` | Parquet    | 53 KB                       | `post_qcew.py` (DuckDB) — already optimal       |
| `vt-zoning-update.fgb`       | FlatGeobuf | 17 MB                       | `post_zoning.py` via `masterload()` + Geopandas |
| `*_Soil_Septic.fgb` (×7)     | FlatGeobuf | 8–24 MB each (114 MB total) | `get_filters.py` via `masterload()` + Geopandas |
| `VermontServiceArea.geojson` | GeoJSON    | 4.8 MB                      | `masterload()`, infrequently queried            |
| `VermontWWTF.geojson`        | GeoJSON    | 604 KB                      | `masterload()`, infrequently queried            |
| `flood-legal.json`           | JSON       | ~100 MB (frontend)          | Frontend only — served as static asset          |

---

## Consolidation Recommendations

### Priority 1 — High value, low risk: time-series CSVs → DuckDB views

**Files:** `unemployment_rate_by_year.csv`, `median_earnings_by_year.csv`,
`med_home_value_by_year.csv`, `med_smoc_by_year.csv`, `commute_time_by_year.csv`,
`commute_habits_by_year.csv`, `VT_Historic_Population.csv`

**Why:** These are the only active non-spatial data still loaded by pandas in `post_census.py`.
Each is loaded separately on every request with no query pushdown — all filtering happens in
Python after loading the full file into memory.

**Recommendation:**

- Register each CSV as a DuckDB view in `post_acs5_db.py` (alongside the existing parquet
  views) using `read_csv_auto()`. No file conversion needed — DuckDB reads CSVs natively and
  efficiently.
- Apply WHERE filters in SQL before returning to Python, eliminating the full-file pandas load.
- The `split_name_col()` NAME-parsing step (Jurisdiction + County extraction) is currently
  applied by `load_census_data()`; because these CSVs use NAME as the location key, filter them
  by NAME directly in DuckDB (matching the `post_acs5_db.py` pattern) rather than re-doing the
  regex split.
- Update `post_census.py` `/{category}/{subcategory}` endpoints for these subcategories to call
  the DuckDB connection instead of `load_census_data()`.

**Expected benefit:** Eliminates ~3 MB of CSV I/O per request. Consolidates all tabular census
data access into one DB connection and makes future cross-series queries trivial (e.g. unemployment
vs. median earnings for the same location in one query).

---

### Priority 2 — Medium value: snapshot FGBs → route tabular queries to tidy parquets

**Files:** `VT_HOUSING_ALL.fgb`, `VT_ECONOMIC_ALL.fgb`, `VT_DEMOGRAPHIC_ALL.fgb`,
`VT_SOCIAL_ALL.fgb`, `VT_HOUSING_ALL_2013.fgb`

**Why:** These FGBs are loaded by Geopandas for metric calculations (sums, means by
Jurisdiction/County) in `post_census.py`. Their geometry is not used by the tabular routes —
they were the original data source before the tidy parquet pipeline was built. The tidy parquets
(`vt_acs5_b_*_tidy.parquet`) already cover the same data in a better format.

**Recommendation:**

- Audit which metrics in `post_census.py` are already covered by the existing DuckDB tidy
  parquets. Migrate those metric calculations to SQL queries.
- For the 2013 vs. 2023 delta comparison: export pre-computed delta values to a small parquet
  and query it with DuckDB. The current approach loads two full ~850 KB FGBs just to compute a
  handful of aggregate deltas.
- Retain the FGBs only for routes that actually need geometry (GeoJSON map layers).

**Expected benefit:** Removes Geopandas overhead for purely tabular queries; unifies the data
access model.

---

### Priority 3 — Low value for now: zoning tabular aggregation

**File:** `vt-zoning-update.fgb` (17 MB)

**Why:** Zoning acreage aggregations (totals by district type, by county) are simple GROUP BY
queries on non-spatial columns. Geopandas loads the full geometry just to get these numbers.

**Recommendation:**

- Export the non-geometry columns of `vt-zoning-update.fgb` to a companion parquet (e.g.,
  `vt-zoning-tabular.parquet`).
- Use DuckDB for aggregation queries; keep Geopandas only for the map rendering route.

**Expected benefit:** Skips the 17 MB FGB geometry load for tabular requests.

---

### Not recommended: soil suitability, wastewater, flood hazard

**Soil suitability:** The 7 regional FGBs are loaded on-demand by RPC and rendered as
GeoJsonLayer tiles. The geometry is the whole point. DuckDB does not handle GeoDataFrames
natively — consolidation would require WKB encoding round-trips for no meaningful benefit over
the current cached Geopandas approach.

**Wastewater:** Two small GeoJSON files accessed infrequently, geometry-centric. Not worth the
conversion overhead.

**Flood hazard:** A frontend static asset. No backend query at all.

---

### Cleanup: remove unused CSVs and build artifacts

The four wide-format CSVs (`vt_acs5_{topic}_data.csv`, 8–15 MB each) and their tidy counterparts
(`vt_acs5_{topic}_data_tidy.csv`, 100–200 MB each) are not used by any active API route. They
appear to be intermediate build artifacts from the scraper pipeline.

**Recommendation:** Delete the four `_tidy.csv` files (~680 MB total on disk). Verify no route
references `vt_acs5_combined.csv` or the wide CSVs before deleting them as well. The tidy
parquets and FGBs fully cover their data for API purposes.

---

## Summary Table

| Data stream                                   | Current approach              | Recommendation                                                          | Priority   |
| --------------------------------------------- | ----------------------------- | ----------------------------------------------------------------------- | ---------- |
| ACS5 tidy parquets (B-series + DP-series)     | ✅ DuckDB                     | Already optimal                                                         | —          |
| QCEW employment parquet                       | ✅ DuckDB                     | Already optimal                                                         | —          |
| 6× time-series CSVs + historic population CSV | pandas (per-request CSV load) | DuckDB views via `read_csv_auto()`                                      | **High**   |
| Snapshot FGBs (2023 + 2013, 4× topics)        | Geopandas (tabular queries)   | Migrate tabular metrics to DuckDB tidy parquets; FGBs for geometry only | **Medium** |
| Zoning FGB (tabular aggregation)              | Geopandas                     | Export tabular parquet; DuckDB for GROUP BY                             | **Low**    |
| Soil suitability FGBs (7× RPC)                | Geopandas                     | Keep as-is                                                              | —          |
| Wastewater GeoJSONs                           | Geopandas                     | Keep as-is                                                              | —          |
| Flood hazard JSON                             | Frontend static               | Keep as-is                                                              | —          |
| 4× wide CSVs + 4× tidy CSVs                   | Not used                      | Delete (verify first)                                                   | Cleanup    |

---

## Testing Strategy: Preserving Functionality During Migration

Any data migration that changes how a route loads or filters data carries a risk of silent
behavioral regression — the endpoint still responds 200, but the numbers are wrong. The
safeguards below apply to every Priority 1 and Priority 2 change before it is committed.

### 1. Golden-output tests (value tests)

Before touching any route, capture the exact output for a representative set of requests and
store it as expected output in the test suite. After migration, the same requests must produce
byte-for-byte identical records (or numerically equivalent within float tolerance).

**Implementation pattern:**

```python
# backend/tests/test_census_golden.py
import pandas as pd
import pytest
from fastapi.testclient import TestClient
from api.main import app

client = TestClient(app)

ADDISON = {"filters": {"Jurisdiction": ["Vergennes"]}}

@pytest.mark.parametrize("subcategory,expected_csv", [
    ("unemployment_rate",   "tests/golden/unemployment_addison.csv"),
    ("median_earnings",     "tests/golden/median_earnings_addison.csv"),
    ("median_home_value",   "tests/golden/med_home_value_addison.csv"),
    ("median_smoc",         "tests/golden/med_smoc_addison.csv"),
    ("commute_habits",      "tests/golden/commute_habits_addison.csv"),
    ("commute_time",        "tests/golden/commute_time_addison.csv"),
    ("historic_population", "tests/golden/historic_population_addison.csv"),
])
def test_subcategory_matches_golden(subcategory, expected_csv):
    resp = client.post(f"/load/census/economic/{subcategory}", json=ADDISON)
    assert resp.status_code == 200
    actual = pd.DataFrame(resp.json()["data"])
    expected = pd.read_csv(expected_csv)
    pd.testing.assert_frame_equal(
        actual.sort_values(actual.columns.tolist()).reset_index(drop=True),
        expected.sort_values(expected.columns.tolist()).reset_index(drop=True),
        check_like=True,
        rtol=1e-4,
    )
```

Golden CSVs are generated **once** against the current (pre-migration) code and committed to
`backend/tests/golden/`. They are the source of truth. A script in
`backend/tests/generate_golden.py` should regenerate them when the upstream data files change.

### 2. Column-presence tests

Assert that the response contains the expected columns — especially `Jurisdiction` and `County`,
which are produced by `split_name_col()` and must survive the migration.

```python
def test_subcategory_has_required_columns(subcategory):
    resp = client.post(f"/load/census/economic/{subcategory}", json={})
    data = resp.json()["data"]
    assert len(data) > 0
    row = data[0]
    assert "Jurisdiction" in row
    assert "County" in row
```

### 3. Filter-correctness tests

For each migrated endpoint, test that:

- An empty filter returns all rows.
- A specific Jurisdiction filter returns only rows for that jurisdiction.
- A nonsense filter returns an empty result (not an error).

### 4. Run order

```
# Before making any code change:
pytest backend/tests/test_census_golden.py  # must pass — establishes baseline

# After migration:
pytest backend/tests/                        # all existing tests + new golden tests
```

If golden tests fail after migration, the DuckDB query result diverges from the pandas result
and the migration must be corrected before merging.
