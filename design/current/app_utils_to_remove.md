
# Disclaimer 

This is claude generated. review facts on the ground carefully before implementing. 


# Porting `app_utils` Out

`backend/app_utils/` is the pre-DuckDB backend. It loads FGB/GeoJSON/CSV files
into geopandas at request time, cleans them in pandas, and hands DataFrames to
the API. Everything it does is now supposed to happen either at build time (in
`build/`, writing parquet) or in SQL (in `query/`).

[Codebase_Primer.md](Codebase_Primer.md) already states the goal: *"app-utils:
legacy code to be migrated over to either build or query, and ported as much as
possible into SQL. Eventually this will be deleted."* This doc is the actual
list of what's left and a suggested order for doing it.

Companion docs: [Data_Engineering.md](Data_Engineering.md) for the
collect → build → query → API pipeline this is being folded into, and
[backend-api-restructure.md](../archive/backend-api-restructure.md) for the
original (now partly completed) plan.

---

## Before you start

**Only `backend/api/` imports `app_utils`.** The `query/` and `build/` folders
don't touch it at all. Two exceptions live in `data_collection/`, and the tests
import two modules. That's the whole surface:

| Importer | What it pulls in |
|---|---|
| `api/routes/get_routes/get_wholedata.py` | `data_loading.masterload`, `data_loading.load_and_process_soil_septic`, `flooding.add_flood_color` |
| `api/routes/post_routes/post_census.py` | `data_loading.masterload`, `data_loading.load_census_data`, `timeseries_db.query_timeseries`, `df_filtering.filter_from_request`, `df_filtering.mass_filter_from_requests`, `housing.housing_df_metric_dict` |
| `api/routes/post_routes/post_export.py` | `data_loading.masterload`, `timeseries_db.query_timeseries` |
| `data_collection/acs5_scrape.py` | `census.tidy_census` |
| `data_collection/base.py` | `census.split_name_col` |
| `tests/` | `df_filtering`, `timeseries_db` |

That means **nine imported symbols** hold the whole folder alive. Everything
else in `app_utils` is reachable only because one of those nine calls it.

**How to check whether something is really dead.** Grep the whole repo, not
just the file you're looking at — and remember that a function called only from
inside its own module still counts as used:

```bash
# does anything outside app_utils import this module?
grep -rn "app_utils.mapping\|from app_utils import.*mapping" --include="*.py" --include="*.qmd" .

# is this function called anywhere, including same-file callers?
grep -rn "\badd_tooltip_from_dict\b" --include="*.py" .
```

**Keep the app running at every step.** Port one loader, repoint its route,
confirm the page still works in the browser, delete the old path. Don't try to
land all of it at once.

---

## What's left

13 modules, roughly 1,650 lines.

| Module | Lines | Job | Destination |
|---|---|---|---|
| `census.py` | 288 | ACS variable-code → human-label lookup and merge | `build/` |
| `data_loading.py` | 276 | `masterload` cache + 11 file loaders | delete (replaced by SQL) |
| `constants/ACS.py` | 211 | Hardcoded ACS column lists and metric definitions | mostly delete |
| `timeseries_db.py` | 133 | SQL against the `acs5_*` tables | **`query/` (just move it)** |
| `data_cleaning.py` | 131 | Whitespace stripping, timestamp → str | delete |
| `housing.py` | 115 | Housing snapshot metrics + plot frames | decide: SQL or delete |
| `color.py` | 94 | Matplotlib colormap → RGBA fill columns | `build/` (color lookup table) |
| `df_filtering.py` | 85 | Apply frontend filters to a DataFrame | delete (see `sql_render.py`) |
| `flooding.py` | 84 | Flood-zone colors and tooltips | `build/` |
| `mapping.py` | 69 | Tooltip HTML, biggest-intersection join | `build/` |
| `wastewater.py` | 67 | Soil suitability colors, tooltips, coords | `build/` |
| `zoning.py` | 65 | Zoning cleanup, colors, tooltips | delete (already ported) |
| `constants/dataset_sources.py` | 38 | Filename → cache-key maps for census FGBs | delete |

---

## 1. `timeseries_db.py` is in the wrong folder, not legacy

Start here. It's the cheapest win in the folder and it builds confidence.

This module is **already** SQL against DuckDB — it imports
`query.processed_db.DB` and selects from the `acs5_*` tables. There is nothing
to port. It's query-layer code that happens to live in `app_utils/`.

**How:** `git mv backend/app_utils/timeseries_db.py backend/query/timeseries.py`,
then fix three imports (`post_census.py`, `post_export.py`,
`tests/test_census_timeseries_db.py`). Consider folding its `_TABLES` registry
into `query/acs5.py`, which already covers the same tables from a different
angle.

**Done when:** no `app_utils.timeseries_db` anywhere, and
`uv run pytest tests/test_census_timeseries_db.py` passes.

While you're in there: `_TABLES["historic_population"]["cols"]` has `"Year"`
commented out and no `year` entry, but the table does return a `year` column.
A year filter from the frontend gets silently dropped. Worth confirming that's
intentional.

---

## 2. The `masterload` map pipeline (6 modules, ~655 lines)

This is the bulk of the work: `data_loading.py`, `zoning.py`, `wastewater.py`,
`flooding.py`, `mapping.py`, `color.py`.

`masterload(name)` is a dict of loader lambdas plus an in-memory cache. Each
loader reads a geo file, runs it through a `process_*` wrapper that cleans
columns, attaches RGBA colors, and builds tooltip HTML, then caches the result
for the process lifetime.

**All of that is build-time work.** The colors and tooltips don't depend on the
request. The pattern to copy already exists — look at
`build/sql/zoning_colors.sql` (a color lookup table) and `query/zoning.py` +
`query/sql/zoning/` (SQL that joins colors on at query time).

Loader by loader:

| Loader key | Route | Status | What to do |
|---|---|---|---|
| `zoning` | `GET /load/mapping/zoning/standard` | **Already ported.** `query/zoning.py` serves the same data over POST; the frontend GETs the old route only for the initial statewide load. | Point [page_content.tsx:38](../frontend/src/app/mapping/[slug]/page_content.tsx#L38) at the POST route with empty filters, or add a thin GET wrapper over `get_zoning_geojson`. Deletes `zoning.py` + `color.py`. |
| `soil_septic` | `GET /load/mapping/wastewater/soil_septic/{rpc}` | Partly ported. `query/wastewater.py::get_soil_suit_geojson` reads the `soil_suitability_*` tables but has no per-RPC filter. | Add RPC as a filter column, repoint the route. Deletes `wastewater.py`. |
| `flood_legal` | `GET /load/mapping/flood_legal` | Not ported. Reads `frontend/public/data/flood-legal.json` — the data isn't even in `Data/` yet. | Add a `build/` step: JSON → parquet, with zone colors as a lookup table (copy `zoning_colors.sql`). Deletes `flooding.py`. |
| `WWTF` | `GET /load/mapping/wastewater/treatment_facilities` | **Orphaned.** The frontend calls the newer POST `/treatment_facility` instead. | Nothing to port — delete the endpoint. |
| `service_areas` | `GET /load/mapping/wastewater/service_areas` | **Orphaned**, same reason (frontend uses POST `/service_area`). | Delete the endpoint. |
| `census_housing`, `census_economics`, `census_demographics`, `census_social` | `POST /export/csv`, `/export/locations`, housing snapshot | Not ported. Reads FGB and runs `tidy_census` on every cold request. | See §3. |
| `census_combined` | none | **Never requested.** No route asks for this key. | Delete the key. Also kills `load_combine_census` and `COMBINED_CENSUS`. |
| `flooding_with_zoning` | none | **Never requested.** | Delete the key. |
| `soil_septic_with_zoning` | none | **Never requested.** | Delete the key. Also kills `mapping.add_cols_of_biggest_intersection`, the geopandas overlay join — the expensive thing nobody is calling. |

Note the shape of that table: of nine registered loaders, **three are never
requested and two serve endpoints the frontend abandoned.** Only four are
carrying real traffic. Confirm this yourself before deleting anything — grep for
`masterload(` in `api/` and compare the keys.

**Done when:** `masterload`, `LOADERS`, and `_DATA_CACHE` are gone, and
`get_wholedata.py` either doesn't exist or contains only SQL-backed routes.

---

## 3. Census tidying belongs at build time (~330 lines)

`census.py` + `constants/dataset_sources.py`.

`tidy_census` downloads the ACS variable-name table, relabels raw codes like
`DP04_0001E` into readable `Category` / `Subcategory` / `Variable` / `Measure`
columns, and merges them onto the data. `dataset_sources.py` maps cache keys to
FGB filenames and pairs some of them with `tidy_census` as a derivation step.

This runs **per request** today, behind `/export/csv`. It should run once in
`build/acs5.py` and write a tidy parquet, after which the export route is a
`SELECT` with a `WHERE` on County/Jurisdiction.

Two functions in `census.py` have real non-API callers and need a home rather
than deletion:

- `split_name_col` — used by `data_collection/base.py`. Move it into
  `data_collection/` or a shared build helper.
- `tidy_census` — used by `data_collection/acs5_scrape.py`. Move it into
  `build/`.

The other six functions in the file (`get_census_cols`, `split_to_cols`,
`relabel_census_cols`, `merge_census_cols`, `get_geography_title`,
`calculate_delta_values`) are either internals of `tidy_census` or unused.

**Done when:** `post_export.py` runs SQL instead of `masterload`, and nothing
outside `build/` and `data_collection/` imports `census.py`.

---

## 4. Leftovers

**`df_filtering.py`** — `filter_from_request` / `mass_filter_from_requests`
apply frontend filters to a pandas DataFrame. The SQL replacement already
exists: the filter compiler in `sql_render.py` emits `$N` placeholders plus a
params list. This module dies when `post_census.py`'s pandas paths do. Note the
tests import it, so update `tests/test_df_filtering.py` in the same PR.

**`housing.py` + `constants/ACS.py`** (~326 lines) — these back
`POST /load/census/housing/snapshot`, a composite response with a metrics dict
and several plot frames. **The frontend call is commented out** at
[ChartDefs.tsx:84](../frontend/src/components/Charts/configs/ChartDefs.tsx#L84).
So this needs a product decision before any porting: is the housing snapshot
coming back, or is it superseded by the `/load/acs5-db/tidy/housing` charts?
If it's dead, this is the single biggest free deletion left. If it's coming
back, it becomes a handful of small SQL queries assembled in the route.

Most of `constants/ACS.py` is already dead regardless — only 4 of its 14
constants are reachable, all via `housing.py`. The econ, demographic, social,
and race column lists have no callers at all.

**`data_cleaning.py`** — `strip_all_whitespace` and
`convert_all_timestamps_to_str` only feed the pandas loaders. Both become
build-time concerns (or vanish, since DuckDB handles types). Dies with §2.

---

## Suggested order

Each step leaves the app working.

**Phase 1 — Move `timeseries_db.py` to `query/`.** Pure file move. No behavior
change. *Done when:* tests pass, no `app_utils.timeseries_db` references.

**Phase 2 — Delete the free stuff.** The three never-requested loader keys, the
two orphaned wastewater GET endpoints, and the unreachable `constants/ACS.py`
entries. *Done when:* `add_cols_of_biggest_intersection` and
`load_combine_census` are gone and the API still boots.

**Phase 3 — Decide the housing snapshot's fate.** Blocks ~326 lines either way.
Ask before writing code.

**Phase 4 — Finish zoning and soil-septic.** Both are most of the way there;
this is mostly repointing the frontend and adding an RPC filter. *Done when:*
`zoning.py`, `wastewater.py`, and `color.py` are gone.

**Phase 5 — Flood data into `build/`.** The one genuinely new ETL step, and it
also gets `flood-legal.json` out of `frontend/public/`. *Done when:*
`flooding.py` is gone.

**Phase 6 — Census tidying into `build/`.** The biggest remaining chunk.
*Done when:* `post_export.py` and `post_census.py` don't call `masterload`.

**Phase 7 — Delete the folder.** *Done when:* `backend/app_utils/` doesn't
exist, `uv run pytest` passes, `uv run ruff check` is clean, and every map page
plus the data-export page works in the browser.

---

## Open questions

- **Housing snapshot: revive or delete?** Phase 3. Needs a product answer, not
  an engineering one.
- **The zoning GET route.** Should the frontend's initial statewide load go
  through the POST filter route with empty filters, or should `query/` expose a
  GET for "everything"? The second is friendlier to cache.
- **Tooltip HTML.** `add_tooltip_from_dict` builds display strings in Python.
  Generating HTML at build time and storing it in a column works, but it means
  a rebuild to change tooltip wording. Building it in the frontend from plain
  columns is probably cleaner — worth deciding before porting rather than
  after.
- **`flood-legal.json` lives in `frontend/public/`.** Moving it into the
  pipeline is the right call, but confirm nothing on the frontend reads that
  file directly first.
