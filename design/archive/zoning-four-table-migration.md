# Zoning Four-Table Migration — Implementation Reference

Porting the zoning API routes off `masterload` (geopandas FGB) onto the four
normalized parquet tables in `backend/Data/_Processed/zoning/`. This is Phase 4
of [backend-api-restructure.md](backend-api-restructure.md), but with zoning
split into four tables instead of one.

## The tables (keyed on `OBJECT_ID`)

| table    | rows  | contents                                                               |
| -------- | ----- | ---------------------------------------------------------------------- |
| `info`   | 1739  | identity + summary attrs + `Acres`, `District_Type` pre-cleaned        |
| `geom`   | 1739  | `OBJECT_ID` + geometry (GeoParquet; loads back as native `GEOMETRY`)   |
| `rules`  | 74536 | long format: `OBJECT_ID, use_type, rule, val` (no consumer yet)        |
| `colors` | 4     | `district_type -> hex_color, rgba` (rgba is a JSON string `[r,g,b,a]`) |

## The access pattern: IDs first, geometry last

`OBJECT_ID` is the currency. Every operation is "filter the attribute table to a
set of districts, then optionally decorate":

- **Filter** = a `WHERE` clause on `info` (and later `rules`). Returns a row set.
- **Glue** = join `geom` (and `colors`) only when a map render needs it.

Don't write a default `load_zoning()` that always joins geometry — that throws
away the whole point of splitting `geom` out. Geometry attachment is an explicit
step (`geojson()`), never a default.

## Decisions locked in

- **Access:** read the `_Processed` parquet into an **in-memory DuckDB at API
  startup** (parquet is the single source of truth; no `.duckdb` artifact to keep
  in sync). This module is the forward home for _all_ dataset access as sources
  migrate to parquet — `vt_data.duckdb`/`db.py` gets strangled later.
- **Contract:** alias columns back to the frontend's names **in the serving
  query** (`District_Type AS "District Type"`, `Municipal_Name AS Jurisdiction`,
  build `tooltip` + `rgba_color`). Frontend untouched.
- **Scope:** zoning routes only. Don't touch `data_loading.py`.
- **Filtering:** no `FilterState`. A `WHERE` clause + a dict fold, both derived
  from one label->column declaration.

---

## New file: `backend/app_utils/processed_db.py`

The generic startup loader. Scans `_Processed/**/*.parquet` and materializes each
as `{parent}_{stem}` (same naming as `build/consolidate.py`) -> `zoning_info`,
`zoning_geom`, `zoning_rules`, `zoning_colors`.

```python
"""
Central in-memory DuckDB for the API, built from the _Processed parquet tables.

At import time this scans backend/Data/_Processed/**/*.parquet and materializes
each file as a table named "{parent}_{stem}" (e.g. zoning_info, zoning_geom) --
the same naming convention as build/consolidate.py.

Parquet is the single source of truth; the database is rebuilt fresh on every
boot, so regenerating a parquet is all it takes to update the served data. This
is the forward home for all dataset access as sources migrate to parquet.
"""

import logging
from pathlib import Path

import duckdb

logger = logging.getLogger(__name__)

_PROCESSED_DIR = Path(__file__).resolve().parent.parent / "Data" / "_Processed"


def _load_spatial(con: duckdb.DuckDBPyConnection) -> None:
    """Load the spatial extension, installing it first if necessary."""
    try:
        con.execute("LOAD spatial")
    except duckdb.Exception:
        con.execute("INSTALL spatial")
        con.execute("LOAD spatial")


def _build() -> duckdb.DuckDBPyConnection:
    con = duckdb.connect(":memory:")
    _load_spatial(con)

    parquets = sorted(_PROCESSED_DIR.rglob("*.parquet"))
    if not parquets:
        logger.warning("No parquet files found under %s", _PROCESSED_DIR)

    for path in parquets:
        name = f"{path.parent.name}_{path.stem}"
        con.execute(
            f'CREATE TABLE "{name}" AS SELECT * FROM read_parquet(?)', [str(path)]
        )
        logger.info("Loaded table %s from %s", name, path)

    return con


DB = _build()
```

Notes:

- `geom` loads back as native `GEOMETRY` (GeoParquet metadata + spatial loaded),
  so **no `ST_GeomFromWKB`** is needed — use `g.geom` directly in spatial funcs.
- Single global connection, matching the `db.py` precedent. Routes are `async`
  and call `.df()` synchronously — same as the existing `timeseries_db` /
  `post_acs5_db` routes. Not fixing that here.

---

## New file: `backend/app_utils/zoning_db.py`

The access layer. One `_FILTER_COLS` declaration drives both the `WHERE` builder
and the cascading tree. All frontend aliasing lives here. No `FilterState`.

```python
"""
DuckDB-backed access to the normalized zoning tables (zoning_info, zoning_geom,
zoning_rules, zoning_colors) in the in-memory _Processed database.

Pattern: filter against the attribute table to a set of districts, then attach
geometry only when a map render actually needs it. All aliasing back to the
column names the frontend expects ("District Type", "Jurisdiction", rgba_color,
tooltip) lives here so the storage schema can use clean underscore names.
"""

import json
import logging

from app_utils.processed_db import DB

logger = logging.getLogger(__name__)

# frontend filter label -> real zoning_info column. Single source of truth:
# both the WHERE builder and the cascading tree derive from this.
_FILTER_COLS = {
    "County": "County",
    "RPC": "RPC",
    "Jurisdiction": "Municipal_Name",
    "District Name": "District_Name",
    "District Type": "District_Type",
}

# ordered subset that forms the cascading map filter (labels are also filter keys)
TREE_LABELS = ["County", "Jurisdiction", "District Name"]

_GREY = [150, 150, 150, 180]


def _attr_where(filters: dict | None) -> tuple[str, list]:
    """frontend-named filters -> (WHERE clause, params). Unknown keys ignored."""
    clauses, params = [], []
    for label, values in (filters or {}).items():
        col = _FILTER_COLS.get(label)
        if col is None:
            logger.warning("zoning_db: ignoring unknown filter '%s'", label)
            continue
        values = [values] if isinstance(values, str) else values
        if not values:
            continue
        clauses.append(f'"{col}" IN ({", ".join("?" for _ in values)})')
        params.extend(values)
    return (("WHERE " + " AND ".join(clauses)) if clauses else ""), params


def _nest(rows: list[tuple]) -> dict:
    """Fold sorted distinct rows into a nested dict; leaves are None."""
    tree: dict = {}
    for row in rows:
        node = tree
        for val in row[:-1]:
            node = node.setdefault(val, {})
        node.setdefault(row[-1], None)
    return tree


def filter_tree() -> dict:
    """Distinct County > Jurisdiction > District Name folded into a nested dict."""
    cols = [_FILTER_COLS[label] for label in TREE_LABELS]
    select = ", ".join(f'"{c}"' for c in cols)
    order = ", ".join(str(i + 1) for i in range(len(cols)))
    rows = DB.execute(
        f"SELECT DISTINCT {select} FROM zoning_info ORDER BY {order}"
    ).fetchall()
    return {"tree": _nest(rows), "labels": TREE_LABELS}


def geojson(filters: dict | None = None) -> dict:
    """FeatureCollection for the map: info + geom + colors, IDs filtered first."""
    where, params = _attr_where(filters)
    df = DB.execute(
        f"""
        SELECT
            i.County        AS "County",
            i.Municipal_Name AS "Jurisdiction",
            i.Municipal_Name || ' ' || i.District_Name AS "Jurisdiction District Name",
            i.District_Type AS "District Type",
            i.Acres         AS "Acres",
            c.hex_color     AS hex_color,
            c.rgba          AS rgba,
            ST_AsGeoJSON(ST_Simplify(g.geom, 0.0001)) AS geometry
        FROM VersoZoning_info i
        JOIN VersoZoning_geom g USING (OBJECT_ID)
        LEFT JOIN VersoZoning_colors c ON c.district_type = i.District_Type
        {where}
        """,
        params,
    ).df()

    features = []
    for rec in df.to_dict("records"):
        geometry = json.loads(rec.pop("geometry"))
        rgba = rec.pop("rgba")
        props = dict(rec)
        props["rgba_color"] = json.loads(rgba) if rgba else _GREY
        acres = props.get("Acres")
        props["Acres_fmt"] = f"{acres:,.0f}" if acres is not None else ""
        props["tooltip"] = {
            "__title__": "Zoning",
            "District": props["Jurisdiction District Name"],
            "Type": props["District Type"],
            "Acreage": props["Acres_fmt"],
        }
        features.append(
            {"type": "Feature", "geometry": geometry, "properties": props}
        )
    return {"type": "FeatureCollection", "features": features}


def aggregated_acres(filters: dict | None = None):
    """(aggregate df by District Type, per-district detail df) for the acreage chart."""
    where, params = _attr_where(filters)
    data = DB.execute(
        f"""
        SELECT
            i.District_Type AS "District Type",
            SUM(i.Acres)    AS "Acres",
            any_value(c.hex_color) AS hex_color
        FROM zoning_info i
        LEFT JOIN zoning_colors c ON c.district_type = i.District_Type
        {where}
        GROUP BY i.District_Type
        """,
        params,
    ).df()
    table = DB.execute(
        f"""
        SELECT
            i.County        AS "County",
            i.Municipal_Name || ' ' || i.District_Name AS "Jurisdiction District Name",
            i.District_Type AS "District Type",
            i.Acres         AS "Acres",
            c.hex_color     AS hex_color
        FROM zoning_info i
        LEFT JOIN zoning_colors c ON c.district_type = i.District_Type
        {where}
        """,
        params,
    ).df()
    return data, table


def tabular(filters: dict | None = None):
    """Clean tabular district attributes (no geometry) for data export."""
    where, params = _attr_where(filters)
    return DB.execute(
        f"SELECT * EXCLUDE (OBJECT_ID) FROM zoning_info {where}", params
    ).df()
```

---

## Route rewrites

### `backend/api/routes/post_routes/post_zoning.py` (full replacement)

```python
from fastapi import APIRouter

from api.metadata_registry import get_metadata
from api.models import APIResponse, FilterRequest, make_response
from app_utils import zoning_db

router = APIRouter()


@router.post("/load/mapping/zoning")
async def read_zoning_data(request: FilterRequest) -> APIResponse:
    metadata = get_metadata("zoning")

    if request.format == "aggregated_acres":
        data, table = zoning_db.aggregated_acres(request.filters)
        return make_response(data, metadata, table)

    # Default: GeoJSON so geometry is preserved for map rendering
    return APIResponse(
        data=zoning_db.geojson(request.filters), tableData=None, metadata=metadata
    )
```

### `backend/api/routes/get_routes/get_filters.py` (full replacement)

```python
from fastapi import APIRouter

from app_utils import zoning_db

router = APIRouter()


@router.get("/load/mapping/zoning/filters")
async def read_zoning_filters():
    return zoning_db.filter_tree()
```

### `backend/api/routes/get_routes/get_wholedata.py` (only the zoning GET)

Leave the flood / WWTF / service-area GETs on `masterload` for now. Replace just:

```python
# Zoning GET Endpoint
@router.get("/load/mapping/zoning")
async def read_zoning_data():
    from app_utils import zoning_db

    return zoning_db.geojson()
```

### `backend/api/routes/post_routes/post_export.py` (`_load_zoning` body)

```python
def _load_zoning():
    """Vermont zoning district attributes (no geometry) for tabular export."""
    from app_utils import zoning_db

    return zoning_db.tabular()
```

---

## Frontend contract (must stay satisfied — do not change frontend)

| consumer                                       | expects                                                                                                                                             |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mapping/index.tsx`                            | `properties.rgba_color` (array), `properties.tooltip` (`{__title__, District, Type, Acreage}`)                                                      |
| `mapping/[slug]/page_content.tsx`              | GeoJSON props `"District Type"`, `"Acres"`                                                                                                          |
| `Charts/configs/ChartDefs.tsx` (acreage)       | `data`: `"District Type"`, `"Acres"`, `hex_color`; `tableData`: `County`, `"Jurisdiction District Name"`, `"District Type"`, `"Acres"`, `hex_color` |
| `FilterUI/useApplyFilters.ts` (`buildFilters`) | sends filter keys `County`, `RPC`, `Jurisdiction`                                                                                                   |
| `FilterUI/GetFilterTreeFromAPI.tsx`            | `{tree, labels}` from `/zoning/filters`                                                                                                             |

Name mapping reference (storage -> frontend):
`Municipal_Name -> Jurisdiction`, `District_Name -> "District Name"`,
`District_Type -> "District Type"`, `Municipal_Name + " " + District_Name -> "Jurisdiction District Name"`.

Response shapes (unchanged from current):

- **GET** `/load/mapping/zoning` -> raw `FeatureCollection`.
- **POST** `/load/mapping/zoning` (default) -> `APIResponse{ data: FeatureCollection }`.
- **POST** `format=aggregated_acres` -> `APIResponse{ data: [...], tableData: [...] }`.

---

## Deliberately NOT touched

- `app_utils/data_loading.py`, `masterload("zoning")`, and the spatial joins
  `flooding_with_zoning` / `soil_septic_with_zoning` — now only used by the
  legacy Streamlit `backend/pages/` (already broken by the FGB underscore rename;
  out of scope).
- The flood / WWTF / service-area GET routes — still on `masterload`.
- `FilterState` in `df_filtering.py` — still used by the census/qcew POST routes
  via `filter_from_request`. Removing it is a later pass.

## Behavior change to be aware of

Unknown filter columns are now **logged and ignored** (matching the
`timeseries_db` pattern), where the old `filter_from_request` raised a 400. If
you want the hard 400 back, raise inside `_attr_where` when `col is None`.

## Validation checklist

- [ ] `conda run -n leahy_data python -c "from app_utils.processed_db import DB; print(DB.execute('SHOW TABLES').df())"` lists the four `zoning_*` tables.
- [ ] Backend boots: `uvicorn api.main:app --port 6767`.
- [ ] `GET /load/mapping/zoning/filters` -> `{tree, labels}` with `labels == ["County","Jurisdiction","District Name"]`.
- [ ] `GET /load/mapping/zoning` -> FeatureCollection; features have `rgba_color`, `tooltip`, `"District Type"`, `"Acres"`.
- [ ] `POST /load/mapping/zoning` `{}` -> map renders; `{filters:{Jurisdiction:["Rockingham"]}}` -> filtered.
- [ ] `POST /load/mapping/zoning` `{format:"aggregated_acres"}` -> acreage chart + detail table.
- [ ] `conda run -n leahy_data pytest backend/tests/` green (esp. `test_export_route.py`).

```

```
