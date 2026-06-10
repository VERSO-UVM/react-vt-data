# Backend API Restructure

A working plan to standardize `backend/api/` around: DuckDB-first data access,
one response envelope, and purpose-built request models. Companion doc:
[duckdb_consolidation.md](duckdb_consolidation.md) covers the data-file
inventory and per-source migration priority.

---

## Diagnosis

### Storage backends (two, inconsistently applied)

- **DuckDB** — `post_acs5_db.py`, `post_qcew.py`, and the time-series branch of
  `post_census.py`. Routes query directly, return tidy DataFrames.
- **`masterload` (pandas/geopandas)** — everything else. In-memory cache keyed
  by `(name, rpc)`, with 9 registered loaders covering map FGBs, GeoJSON,
  census dict-of-frames, and two precomputed spatial joins.

### Response shape (not uniform)

- Most POST routes go through `make_response()` → `APIResponse`
  (`{data, tableData?, metadata?}`).
- GET map routes ([get_wholedata.py](../backend/api/routes/get_routes/get_wholedata.py))
  and the housing snapshot return raw dicts/GeoJSON — bypassing the envelope.
- `metadata` is optional with a `TODO` to make it required throughout.

### `FilterRequest` is overloaded

One Pydantic model carries fields for both map filtering and ACS lookups.
Field-by-field actual usage:

| Field | Used where | Verdict |
|---|---|---|
| `filters` | zoning, qcew, census (3 endpoints) via `filter_from_request` / `mass_filter_from_requests` | Keep — the only broadly-used field |
| `format` | only [post_zoning.py:19](../backend/api/routes/post_routes/post_zoning.py#L19) | Keep, scoped to map model |
| `include` | only [post_census.py:78-86](../backend/api/routes/post_routes/post_census.py#L78-L86) (housing snapshot) | Keep, scoped to snapshot model |
| `name` | all 5 `tidy_*` endpoints in `post_acs5_db.py` | Keep, scoped to ACS model |
| `year_min`/`year_max` | same — all 5 `tidy_*` endpoints | Keep, scoped to ACS model |
| `categories` | nowhere | **Delete** |
| `table` | nowhere on `FilterRequest` (`DPSeriesRequest` has its own) | **Delete** |
| `measure` | nowhere on `FilterRequest` (`DPSeriesRequest` has its own) | **Delete** |

### `masterload` audit (per registered loader)

| Loader | What it does | Migration verdict |
|---|---|---|
| `flood_legal` | Read GeoJSON, simplify | ETL → table; bake `add_flood_color` in as generated column or view |
| `WWTF` | Read GeoJSON | ETL → table (trivial) |
| `service_areas` | Read GeoJSON | ETL → table (trivial) |
| `zoning` | FGB + `process_zoning_data` cleanup | ETL → table (cleanup runs once at build time) |
| `soil_septic` | Per-RPC FGB + `process_soil_data` | ETL → one unioned table with an `rpc` column; query `WHERE rpc = ?` |
| `census_housing`/`economics`/`demographics`/`social` | Dict-of-frames (raw + derived) via `load_census_data_dict` | ETL → one table per dict key; callers query the table they want |
| `census_combined` | UNION across cached dicts with a `Source` label | ETL → UNION ALL view/table with literal `Source` column |
| `flooding_with_zoning` | Spatial biggest-intersection join | **Precompute at ETL time** — too expensive per request |
| `soil_septic_with_zoning` | Same, per RPC | Precompute at ETL time |

### Has to survive as thin Python (not in masterload, not in ETL)

- `housing_df_metric_dict` (`/load/census/housing/snapshot`) — composite
  response with a metrics dict and several plot frames. Becomes one query per
  section after a SQL fetch.
- Filter-tree assembly in [get_filters.py](../backend/api/routes/get_routes/get_filters.py)
  — `SELECT DISTINCT County, Jurisdiction, "District Name"` then fold into a
  nested dict for the cascading UI.
- Streamlit pages in `backend/pages/` still import `masterload` directly.
  Legacy; either repoint at DuckDB or leave alone until last.

### Caching

DuckDB's buffer pool replaces the data-side of `masterload`'s memoization.
Response-level caching (e.g. statewide zoning GeoJSON as bytes) is a separate
concern — use `functools.lru_cache` on the serialized JSON or HTTP
`Cache-Control` headers when an endpoint warrants it.

### Watch out for

- **`add_cols_of_biggest_intersection`** is geopandas overlay + biggest-overlap-per-feature.
  DuckDB spatial can do this (`ST_Intersection` + area + window function), but it's
  not one-liner SQL. Prove out before committing.
- **Test import bug:** [test_df_filtering.py:10](../backend/tests/test_df_filtering.py#L10)
  imports `from api.models.filter_models import FilterRequest` — that module doesn't
  exist (only `request_models.py` does). Stale `filter_models.cpython-311.pyc` in
  `__pycache__` suggests a past rename. Tests probably fail on a clean run.
- **`response_models.py` TODO:** `metadata` is optional with a comment to make
  it required everywhere. Worth resolving as part of the standardization pass.

---

## Target shape

### Response envelope (all routes)

```python
class APIResponse(BaseModel):
    data: dict | list
    tableData: dict | list | None = None
    metadata: dict                       # no longer optional
```

Every route returns `APIResponse` via `make_response(...)`. Includes the
current GET map routes and the housing snapshot.

### Request models (split)

```python
class FilterRequest(BaseModel):           # qcew, census/{category}, census subcategory
    filters: dict[str, list[str]] = {}

class MapFilterRequest(FilterRequest):    # zoning
    format: str | None = "geojson"

class SnapshotRequest(FilterRequest):     # census/housing/snapshot
    include: list[str] | None = []

class ACSTidyRequest(BaseModel):          # all 5 tidy_* endpoints
    name: str
    year_min: int = 2010
    year_max: int = 2023
```

`DPSeriesRequest` stays as-is.

### Data access

One `.duckdb` file (or a set of parquets attached as views) as single source
of truth. ETL build script materializes:

- Every former `masterload` source as a table (with derivations baked in).
- The two precomputed spatial joins.
- Geometry-bearing tables for map endpoints (queried with `ST_AsGeoJSON` via
  DuckDB's spatial extension).

Routes do: `DB.execute("SELECT ... WHERE ...", [...]).df()` → `make_response`.

---

## Phased plan

Strangler-fig migration. Old code keeps working at every step; `masterload`
dies when its last caller is gone.

### Phase 0 — Quick wins (no behavior change)

**Goal:** Remove obvious dead code; fix the broken test import.

- Delete `categories`, `table`, `measure` from `FilterRequest`.
- Fix the [test_df_filtering.py:10](../backend/tests/test_df_filtering.py#L10) import
  (`api.models.filter_models` → `api.models.request_models` or the package alias).
- Verify `pytest backend/tests/` passes on a clean checkout.

**Done when:** Tests green; `FilterRequest` has only `filters`, `format`,
`include`, `name`, `year_min`, `year_max`.

---

### Phase 1 — Establish golden-output baselines

**Goal:** Make every later migration step verifiable.

Adopt the pattern from [duckdb_consolidation.md §Testing Strategy](duckdb_consolidation.md#testing-strategy-preserving-functionality-during-migration):
capture the current response for each route as committed golden CSVs in
`backend/tests/golden/`. These become the regression check for Phases 3–5.

**Done when:** Golden tests pass against current code for every route in
`api/routes/`. Generation script lives at `backend/tests/generate_golden.py`.

---

### Phase 2 — Split request models

**Goal:** Mechanical refactor; behavior unchanged.

- Add `MapFilterRequest`, `SnapshotRequest`, `ACSTidyRequest` to
  `api/models/request_models.py`.
- Update each route's type hint to the narrowest model that fits its actual
  field usage.
- Export from `api/models/__init__.py`.
- Run golden tests — should still pass since field semantics don't change.

**Done when:** No route accepts a `FilterRequest` that uses fields outside
its model's declared shape.

---

### Phase 3 — Standardize the response envelope

**Goal:** Every route returns `APIResponse` via `make_response()`.

- Move `add_flood_color` into the loader (or — for now — keep it where it is
  but wrap the output in `APIResponse`). The four GET map routes in
  [get_wholedata.py](../backend/api/routes/get_routes/get_wholedata.py) all
  need this treatment.
- Update the housing snapshot to return `APIResponse` with `metadata` from
  the registry.
- Make `metadata` required on `APIResponse`; supply
  `get_metadata("...")` everywhere (the `TODO` in `response_models.py`).
- Run golden tests — adjust them once for the new envelope shape, then they
  become the reference.

**Done when:** Every route in `api/routes/` returns `APIResponse`; no raw
`json.loads(df.to_json())` returns from route handlers.

---

### Phase 4 — Pilot DuckDB migration: zoning

**Goal:** Prove the SQL-first pattern on one realistic route end-to-end.

Pick zoning because it has both a GET (filter tree, full GeoJSON) and a POST
(filter + aggregate), and `process_zoning_data` is small enough to bake into
ETL cleanly.

- Add an ETL step (one script, idempotent) that loads
  `vt-zoning-update.fgb`, runs `process_zoning_data`, writes a `zoning` table
  into the shared `.duckdb` with geometry as WKB.
- Add a `vt-zoning-tabular.parquet` companion (per
  [duckdb_consolidation.md §Priority 3](duckdb_consolidation.md#priority-3--low-value-for-now-zoning-tabular-aggregation))
  or just a view over the DuckDB table that drops geometry.
- Port [post_zoning.py](../backend/api/routes/post_routes/post_zoning.py) to
  query DuckDB:
  - `format == "aggregated_acres"` becomes a `GROUP BY District Type` query.
  - Default branch becomes `SELECT ..., ST_AsGeoJSON(geometry) FROM zoning WHERE ...`
    + Python assembly into a FeatureCollection.
- Port [get_filters.py](../backend/api/routes/get_routes/get_filters.py) to
  `SELECT DISTINCT` + Python tree fold.
- Port the zoning GET in [get_wholedata.py](../backend/api/routes/get_routes/get_wholedata.py).
- Golden tests must still pass.

**Done when:** No zoning route calls `masterload`; `LOADERS["zoning"]` is
unreferenced by any route (Streamlit may still use it — fine).

---

### Phase 5 — Easy GeoJSON ports

**Goal:** Knock out the trivial cases.

- `flood_legal` — ETL the simplified GeoJSON into a table; bake
  `add_flood_color` as a generated column (or compute in the SELECT).
- `WWTF` — ETL.
- `service_areas` — ETL.
- `soil_septic` — ETL all 7 regional FGBs into one table with an `rpc`
  column; route filters by `WHERE rpc = ?`.

Each follows the Phase 4 pattern: ETL step, route swap, golden test.

**Done when:** [get_wholedata.py](../backend/api/routes/get_routes/get_wholedata.py)
no longer imports `masterload`.

---

### Phase 6 — Census migration

**Goal:** Collapse the dict-of-frames pattern.

Largely overlaps with the Priority 1 + 2 work in
[duckdb_consolidation.md](duckdb_consolidation.md). Specifically:

- The 7 time-series CSVs become DuckDB views (Priority 1 there).
- The 4 snapshot FGB tabular metrics route through tidy parquets
  (Priority 2).
- `census_combined` becomes a `UNION ALL` view with a literal `Source` column.
- The `census_{topic}` dict keys each become standalone tables/views; callers
  ([post_census.py](../backend/api/routes/post_routes/post_census.py),
  [post_export.py](../backend/api/routes/post_routes/post_export.py)) read
  the specific one they want.
- Housing snapshot: `housing_df_metric_dict` becomes a set of small SQL
  queries; composite response is assembled in the route.

**Done when:** `post_census.py` and `post_export.py` don't call `masterload`.

---

### Phase 7 — Spatial joins

**Goal:** Move the two precomputed joins fully into ETL.

- `flooding_with_zoning` — precompute via `ST_Intersection` + area window
  function in the ETL build, materialize as a table.
- `soil_septic_with_zoning` — same, partitioned by RPC.
- Confirm parity with the geopandas overlay output before swapping callers.

**Done when:** `add_cols_of_biggest_intersection` has no runtime callers.

---

### Phase 8 — Cleanup

**Goal:** Delete what's now dead.

- Delete `masterload`, `LOADERS`, `_DATA_CACHE`, and the
  `app_utils/data_loading.py` helpers that no live route calls.
- Either delete `app_utils.{mapping,wastewater,zoning,flooding}` if fully
  absorbed into ETL, or trim to whatever post-query shaping remains.
- Streamlit pages: pick a fate (port or remove).
- Run `ruff check --fix` on the backend.

**Done when:** `masterload` removed; no broken imports; golden + unit tests
pass; backend boots and serves all routes.

---

## Open questions (decide before/during)

- **One `.duckdb` file or many parquets attached as views?** A single file is
  simpler to ship; parquets-as-views keeps source-of-truth in version-friendly
  formats. Probably parquets (already true for time-series) + a `.duckdb`
  that's a build artifact attaching them all.
- **Geometry encoding in DuckDB:** WKB columns + `ST_AsGeoJSON` for serving,
  or store GeoJSON text directly? WKB is more compact and lets queries
  actually use spatial ops; GeoJSON text is dumber but zero-cost to serve.
  Probably WKB.
- **Response-level caching:** worth it for statewide zoning GeoJSON? Defer
  until perf data says so.
- **Streamlit pages:** port or delete? Doesn't block any phase; can be its
  own followup.
