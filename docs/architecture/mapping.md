# Mapping page (map explorer)

The map explorer at `/mapping` lets someone pick a Vermont town, ask a question
of it ("Where could housing be built?"), and click anywhere to see what applies
at that spot. This page covers which components make it up, where each one
lives, and how data moves between them.

Filter internals (`FilterWrap`, `FilterSpec`) are in
[filtering.md](filtering.md); this page only covers how the map uses them.

## The short version

- One client component, `MapExplorerContent` in [page.tsx][page], owns all
  shared state and derives everything the map draws.
- Nothing loads until a town is selected. Every layer fetch is then scoped to
  that town, because statewide layers are too big to fetch and draw at once
  (soil suitability alone is about 180k polygons).
- Each layer row owns its own fetch through the `useMapLayer` hook and pushes
  its GeoJSON up to the page.
- Two registries drive the UI: `MAP_LAYERS` (what can be shown) and
  `MAP_PRESETS` (the questions).
- The words and numbers on screen (headline figures, map key, spot report) are
  pure functions of what is already on the map. They never fetch.
- `VTMap` is a generic deck.gl map shared with other pages. It knows nothing
  about towns, questions, or layers.

## Where things live

Everything is under `frontend/src/` unless noted.

| File                                             | What it holds                                                                            |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| [app/mapping/page.tsx][page]                     | The page: all shared state, town selection, the list of layers handed to the map, layout |
| [MapLayers.ts][layers]                           | `MAP_LAYERS` registry and the `MapLayerConfig` type                                      |
| [MapPresets.ts][presets]                         | `MAP_PRESETS` registry (the questions) and the buildable-areas definition                |
| [LayerPanel.tsx][layerpanel]                     | Renders one `LayerRow` per entry in `MAP_LAYERS`                                         |
| [LayerRow.tsx][layerrow]                         | One layer's switch, status notes, filter form; owns that layer's data                    |
| [UseMapLayer.ts][usemaplayer]                    | `useMapLayer` hook: builds the request, fetches, crops, recolors                         |
| [QuestionList.tsx][questions]                    | The preset picker, phrased as questions                                                  |
| [MapOverlays.tsx][overlays]                      | `InsightStrip`, `MapKey`, `MapControls`: the cards floating over the map                 |
| [SpotCard.tsx][spotcard]                         | Right-hand card for a clicked spot                                                       |
| [townInsights.ts][insights]                      | `buildInsights`, `buildMapKey`, `spotReport`: the numbers, the key, the spot report      |
| [buildableOverlay.ts][buildable]                 | Geometry: zoning ∩ soil − flood, acres inside a town, per-parcel buildable share         |
| [layerColors.ts][colors]                         | Client-side recoloring and the map key entries for each layer                            |
| [jurisdictionMatch.ts][jurisdiction]             | Town name → candidate spellings; merges the town filter into a request                   |
| [spatialScope.ts][spatial]                       | `cropToBBox`: client-side crop of every fetch to the town's bounding box                 |
| [geoUtils.ts][geoutils]                          | `getFeatureBBox`                                                                         |
| [townNames.ts][townnames]                        | Census name → display name, kind, county, search option                                  |
| [useMunicipalities.ts][munis]                    | Fetches the town boundaries                                                              |
| [explorer.module.css][css]                       | All explorer styling                                                                     |
| [components/mapping/index.tsx][vtmap]            | `VTMap`: deck.gl + MapLibre map, hover tooltip, camera                                   |
| [components/mapping/FeatureDetails.tsx][details] | Formats and groups a feature's tooltip fields into sections                              |
| [components/Legend/index.tsx][legend]            | `MapLegend`: swatch + label + optional share                                             |
| [components/FilterRedux/][filterredux]           | `FilterWrap`, `filterDefs`, `assemble`, `postRequest`                                    |

Also in the folder, but not part of the explorer:

- [zoning/page.tsx][zoningpage] is the older standalone zoning map at
  `/mapping/zoning`. It uses `VTMap` in its simple `geojson` / `baseGeojson`
  mode.
- [DistributionCard.tsx][distribution] is not imported anywhere right now.

## Screen layout

The map fills the whole area; everything else floats over it.

```
┌─────────────────┬────────────────────────────────┬──────────────┐
│ panel           │ InsightStrip / hint pills      │ SpotCard     │
│  town search    │                                │ (only while  │
│  QuestionList   │            VTMap               │  a spot is   │
│  LayerPanel     │                                │  selected)   │
│   LayerRow × 6  │ MapKey             MapControls │              │
└─────────────────┴────────────────────────────────┴──────────────┘
```

```
MapExplorerPage                      page.tsx (Suspense, for useSearchParams)
└─ MapExplorerContent                page.tsx
   ├─ VTMap                          components/mapping/index.tsx
   ├─ panel
   │  ├─ town search, popular-town chips, breadcrumb
   │  ├─ QuestionList                QuestionList.tsx
   │  └─ LayerPanel                  LayerPanel.tsx
   │     └─ LayerRow (per layer)     LayerRow.tsx
   │        ├─ useMapLayer           UseMapLayer.ts
   │        └─ FilterWrap            components/FilterRedux/filterWrap.tsx
   ├─ InsightStrip, MapKey, MapControls   MapOverlays.tsx
   │  └─ MapLegend                   components/Legend/index.tsx
   └─ SpotCard                       SpotCard.tsx
      └─ DetailSectionCard           components/mapping/FeatureDetails.tsx
```

`QuestionList` and `LayerPanel` only render once a town is selected, so no
`LayerRow`, and therefore no layer fetch, exists before then.

## State

All of it is `useState` in `MapExplorerContent`. There is no store or context.

| State                                 | Meaning                                                                             |
| ------------------------------------- | ----------------------------------------------------------------------------------- |
| `selectedTown`                        | The chosen municipality feature. Null means the welcome screen.                     |
| `selectedBBox`                        | That town's bounding box: the camera target and the client-side crop.               |
| `activeLayers`                        | Ids of layers switched on. Seeded from `?layer=<id>` in the URL.                    |
| `layerData`                           | GeoJSON per layer id, as last pushed up by each `LayerRow`.                         |
| `loadingIds`                          | Layers fetching right now.                                                          |
| `zoningStats`                         | Zoning's server-computed area stats (`LayerStats`).                                 |
| `activePresetId`                      | The question currently answered by the map, if any.                                 |
| `presetFilters`                       | Filters that question supplies, keyed by layer id.                                  |
| `scopeVersion`                        | Counter bumped when the town or the question changes. Tells active rows to refetch. |
| `parcelColorMode`                     | `'category'` or `'value'`.                                                          |
| `unzoned`                             | Statewide grey "no zoning information" areas, fetched once on mount.                |
| `selection`                           | The clicked spot (`MapClick`) whose card is open.                                   |
| `panelOpen`, `basemap`, `searchValue` | Plain UI state.                                                                     |

Everything else is derived with `useMemo`: `townCandidates`, `unzonedForTown`,
`buildableOverlay`, `parcelsWithBuildability`, `floodAcres`, `sewerAcres`, and
the `mapState` object that feeds `buildInsights`, `buildMapKey` and
`spotReport`.

## How it works

### 1. Picking a town

`useMunicipalities` fetches every town boundary from
`GET /data/vermont/municipalities`. Names arrive in Census form
(`"Montpelier city, Washington County, Vermont"`). Two modules translate them:

- `townNames` produces what the UI shows: `name` ("Montpelier"), `kind`,
  `county`, and the search `option`. "City" / "Town" is kept only where two
  municipalities share a base name (Barre, Newport, Rutland, St. Albans).
- `jurisdictionCandidates` produces the spellings the datasets might store the
  town under ("St. Johnsbury town", "St Johnsbury", "Saint Johnsbury", …).
  These go into every layer request as an `IN` filter.

A town can be picked three ways: the search box, a popular-town chip, or a
click on the map. All three call `selectTown`, which sets the town and bounding
box, clears `layerData`, `zoningStats` and `selection`, and bumps
`scopeVersion`. "All of Vermont" in the breadcrumb calls `clearTown`.

### 2. Loading a layer

Each `LayerRow` calls `useMapLayer(config, townCandidates, townBBox)` and so
has its own `geojson`, `loading` and `error`. A row fetches when it is active
and has not yet fetched for the current `scopeVersion`. That means once on
first switch-on and again whenever the town or question changes, but not when
a layer is toggled off and back on, so the user's own filter edits survive a
toggle.

`applyFilters(specs)` in the hook does this, in order:

1. `applyJurisdictionScope` adds `{ Jurisdiction: townCandidates }` to the spec
   for the table named in the layer's `jurisdiction` config, or appends a new
   spec if none targets that table.
2. `assemble` drops specs with no filters.
3. The body is shaped for the endpoint: zoning and parcels send a list of
   specs; every other layer sends one object, with all specs on the same table
   merged into it.
4. `postRequest` sends it. Zoning answers
   `{ geojson, stats, town_stats, district_stats }`
   (`responseShape: 'geojson-stats'`); the rest answer a bare
   `FeatureCollection` (`'direct'`).
5. `cropToBBox` drops features whose bounding box misses the town's (with a
   0.05° margin). This is the only town scoping flood gets, since it has no
   `jurisdiction` config, and a safety net for name-match misses elsewhere.
6. `recolorLayer` applies client colors (see [Colors](#colors-and-the-map-key)).

`LayerRow` then reports up through three effects: `onDataChange` (GeoJSON, or
null when the layer is off), `onStatsChange` (zoning only) and
`onLoadingChange`. Parcels get one extra step first: `recolorParcels` restyles
them by category or assessed value without refetching.

The starting filters for a fetch are the question's filters for that layer if
there are any, otherwise the layer's `defaultFilters`. The same specs seed
`FilterWrap`, which is remounted with `key={scopeVersion}` so the form shows
them. They are matched to `filterList` by position: spec `i` seeds filter `i`.

### 3. Questions

A question is a `MapPreset`: a list of layer ids plus optional filters per
layer. `handlePresetSelect` replaces `activeLayers`, sets `presetFilters`, and
bumps `scopeVersion`. Clicking the active question again clears the map.

While a question is active, layers it supplies filters for are locked
(`lockedLayerIds`): their checkbox and cascade filters are read-only so the
question keeps meaning what it says. Range sliders stay live. Switching on an
extra layer keeps the question; switching off one of its own layers ends it.

### 4. Zoning and soil together

When zoning and soil suitability are both on, neither is drawn. The map shows
one derived shape instead, from `computeBuildableOverlay`:

1. Drop zoning districts with "conservation" in the name.
2. Union the zoning polygons into one shape, and the soil polygons into
   another.
3. Intersect the two.
4. If the flood layer is on, subtract its Special Flood Hazard Areas
   (`special_flood_hazard_zone === true`).

The shape is called "Buildable land" only under the `buildable-areas` question,
whose filters make that true. Under any other filters it is labeled "Zoning and
soil overlap". If parcels are also on, `withParcelBuildability` adds a
`Buildable: N%` field to each parcel's tooltip.

The criteria are split across two places that must agree: the filters in the
`buildable-areas` preset in [MapPresets.ts][presets] (district types, housing
allowances, soil levels, flood risk) and the geometry in
[buildableOverlay.ts][buildable] (the conservation and flood-zone rules).

### 5. What gets drawn

`page.tsx` builds a `MapLayerItem[]` each render and hands it to `VTMap`.
Bottom to top:

| Id                         | What                                                  | Interaction                          |
| -------------------------- | ----------------------------------------------------- | ------------------------------------ |
| `town-area`                | Invisible fill over the selected town                 | Click only, so any spot opens a card |
| `zoning-base`              | Grey "no zoning information" areas, when zoning is on | Hover + click                        |
| one per `MAP_LAYERS` entry | The layer's data, in registry order                   | Hover + click                        |
| `buildable-overlay`        | The zoning + soil shape                               | Hover + click                        |
| `towns`                    | Every other town, faded                               | Click switches town                  |
| `town-outline`             | Solid outline of the selected town                    | None                                 |

`VTMap` adds an amber ring on top for `outlineFeature`: the clicked feature
itself for a registry layer, or a point at the click for the larger shapes.

### 6. Clicking the map

`VTMap` calls `onFeatureClick` with a `MapClick` (`layerId`, `feature`,
`coordinate`), or null for empty map. `handleMapClick` selects the town if the
click hit `towns`; otherwise it stores the click in `selection`, which opens
`SpotCard`. Escape, the close button, or a click on empty map closes it.

`SpotCard` has an "At this spot" tab plus one tab per group of the clicked
feature's own fields:

- **At this spot** lists a row per area layer from `spotReport`, which runs a
  point-in-polygon test of the clicked coordinate against each layer's data.
  A row is `here` (with the layer's `summaryFields`), `none`, or `off` (with a
  "Show on map" link). Point layers (`points: true`) are skipped.
- **Property / Owner / Details** come from `detailSections`, which groups the
  feature's `tooltip` fields using `DETAIL_GROUPS` in
  [FeatureDetails.tsx][details]. Fields that match no group land under
  "Details", which is the path every non-parcel layer takes.

### 7. Numbers over the map

`buildInsights(mapState)` returns one headline per layer shown:

| Layer                | Headline                                                                          |
| -------------------- | --------------------------------------------------------------------------------- |
| Zoning + soil        | Acres of overlap and its share of the town                                        |
| Zoning               | Share of zoned land matching the filters, or total zoned acres and district count |
| Soil                 | Share of soil shown that is well or moderately suited (weighted by acres)         |
| Flood                | Acres of the town inside the flood zones shown                                    |
| Sewer service areas  | Acres with service, share of town, number of systems                              |
| Treatment facilities | Total design capacity and how many facilities report one                          |
| Parcels              | Count and median assessed value                                                   |

Zoning's figures come from the server (`town_stats`, `district_stats`), which
unions geometry so overlay districts are not counted twice. Flood and sewer
acreage are computed in the browser by `acresInside`.

### Colors and the map key

Features arrive already colored by the backend. `recolorLayer` overrides three
layers so stacked layers stay distinguishable: zoning (by `District Type`),
sewer service areas and treatment facilities (one flat color each). Parcels are
always recolored by `recolorParcels`.

`buildMapKey` builds the key from what is actually drawn: `legendItems` reads
the distinct colors in each layer's current data, so a filtered layer gets a
filtered key. Soil and zoning entries also carry their share.

## Reference

### `MAP_LAYERS`

| Id                     | Title shown                     | Endpoint (`POST /load/mapping/…`)    | Body          | Town filter table                          | Filter defs                  |
| ---------------------- | ------------------------------- | ------------------------------------ | ------------- | ------------------------------------------ | ---------------------------- |
| `flood-legal`          | Flood zones                     | `flood_legal`                        | one object    | none (cropped client-side only)            | `flood_filtering`            |
| `soil-suitability`     | Soil for septic systems         | `wastewater/septic_soil_suitability` | one object    | `VersoWastewater_soilSuitability_info`     | `soil_suitability_filtering` |
| `treatment-facilities` | Wastewater treatment facilities | `wastewater/treatment_facility`      | one object    | `VersoWastewater_treatmentFacilities_info` | none                         |
| `service-areas`        | Sewer service areas             | `wastewater/service_area`            | one object    | `VersoWastewater_serviceAreas_info`        | none                         |
| `zoning`               | Zoning districts                | `zoning/standard_new`                | list of specs | `VersoZoning_info`                         | `zoning_filtering`           |
| `parcels`              | Properties                      | `parcels/standard`                   | list of specs | `VCGIParcels_info`                         | `parcels_filtering`          |

Flood is the only layer with `defaultFilters` (Flood Risk: High or
Undetermined). Two more requests are not layers: `GET
/load/mapping/zoning/unzoned` (the grey backdrop) and `GET
/data/vermont/municipalities` (town boundaries).

Routes are in `backend/api/routes/post_routes/` (`post_flood.py`,
`post_wastewater.py`, `post_zoning.py`, `post_parcels.py`) and the SQL that
builds each feature is in `backend/query/sql/<dataset>/`.

### `MAP_PRESETS`

| Id                | Question                          | Layers                                      | Supplies filters |
| ----------------- | --------------------------------- | ------------------------------------------- | ---------------- |
| `buildable-areas` | Where could housing be built?     | `zoning`, `soil-suitability`, `flood-legal` | Yes, all three   |
| `zoning`          | What does zoning allow?           | `zoning`                                    | No               |
| `flood-zones`     | Where are the flood zones?        | `flood-legal`                               | No               |
| `infrastructure`  | Where is sewer service available? | `treatment-facilities`, `service-areas`     | No               |
| `properties`      | Who owns the land?                | `parcels`                                   | No               |

### What a feature must carry

The map reads two properties from every feature, both set in the layer's SQL:

- `rgba_color`: `[r, g, b, a]`, each 0–255. The fill. Missing means transparent.
- `tooltip`: an object of display fields. `__title__` is the heading; the rest
  are label → value. The hover tooltip shows only the layer's `summaryFields`;
  the spot card shows all of them.

The client logic also reads these top-level properties, so renaming one in SQL
breaks a figure or the key without any error:

| Layer                | Properties read                                              |
| -------------------- | ------------------------------------------------------------ |
| Zoning               | `District Type`, `District Name`                             |
| Soil                 | `Suitability`, `Acres`                                       |
| Flood                | `flood_zone_type`, `flood_risk`, `special_flood_hazard_zone` |
| Sewer service areas  | `System Name`                                                |
| Treatment facilities | `Design Hydraulic Capacity`                                  |
| Parcels              | `Category`, `Assessed Value`                                 |

### `VTMap`

`VTMap` is also used by `/mapping/zoning` and the two data-comparison pages, so
changes to it reach beyond the explorer. It runs in one of two modes:

- **Layer list** (the explorer): pass `layers: MapLayerItem[]`. Each item sets
  `id`, `geojson`, `visible`, and optionally `summaryFields`, `hint`,
  `pickable`, `hoverable`, `lineColor`, `lineWidth`, `highlightColor`.
- **Simple** (the other pages): pass `geojson` and optionally `baseGeojson`.

Passing `onFeatureClick` hands click handling to the caller; without it `VTMap`
opens its own built-in detail card. Other props the explorer uses: `targetBBox`
(the camera flies there when it changes), `fitPadding` (screen space to keep
clear of the floating panels), `basemap` (`'light'` or `'aerial'`),
`outlineFeature`, and a `ref` exposing `zoomBy(delta)` and `refit()`. The
camera is clamped to Vermont and zoom 7–20.

### Styling

All explorer styles are in [explorer.module.css][css], sectioned as panel,
questions, layers, over the map, spot card. Colors and fonts are CSS variables
(`--spruce`, `--birch`, `--ui`, …) set inline on the root element from
`COLORS` in `app/theme.ts`, so the palette has one home.

## Adding things

**A question.** Add an entry to `MAP_PRESETS`. Nothing else is needed. If it
supplies filters, list each layer's specs in the same order as that layer's
`filterList`.

**A layer.** Add an entry to `MAP_LAYERS`. That alone gives it a row in the
panel, a fetch, town scoping (if `jurisdiction` is set), hover tooltips, the
spot card, and a row in "At this spot". These parts are per-layer code and need
a branch each:

- Map key: a `case` in `legendItems` in [layerColors.ts][colors]. Without one
  the layer has no key entry.
- Headline figure: a block in `buildInsights` in [townInsights.ts][insights].
- Color override, if the backend color clashes: a `case` in `recolorLayer`.
- Request body: `applyFilters` sends a list of specs only for `zoning` and
  `parcels`, matched by id. A new endpoint that takes `list[FilterSpec]` needs
  adding there.

## Things to know before changing it

- **The panel and filter forms are hidden, not unmounted.** Each `LayerRow`
  holds its layer's data and each `FilterWrap` holds the user's selections, so
  collapsing either with conditional rendering would lose them.
- **Zoning stats are matched to the town by array identity.**
  `zoningCoverage` checks `zoningStats.scope !== townCandidates`, which works
  because `townCandidates` is memoized on `selectedTown`. Rebuilding that array
  elsewhere would silently blank the zoning figures.
- **The conservation-district exclusion always applies** to the zoning + soil
  shape, not only under the buildable-areas question.
- **`VTMap` has one layer-specific rule:** a layer with id `parcels` gets a
  darker outline that flips to white on the aerial basemap.
- **`spotReport` scans every polygon of every active layer on each click.** It
  is marked with a `ponytail:` comment; add a spatial index if clicks get slow
  in large towns.
- **The hook returns more than the explorer uses.** `legend`, `fetchLegend` and
  `loadInitial` from `useMapLayer` are not called by `LayerRow`, so a layer's
  `legendURL` is never fetched here. The `GET` branch of `applyFilters` is also
  unused, since every layer is `POST`.
- **A few comments are out of date.** [spatialScope.ts][spatial] calls flood
  "GET-only" and [MapLayers.ts][layers] refers to `explorer/page.tsx` and
  `page_content.tsx`; flood is `POST` and the page is `app/mapping/page.tsx`.

[page]: ../../frontend/src/app/mapping/page.tsx
[layers]: ../../frontend/src/app/mapping/MapLayers.ts
[presets]: ../../frontend/src/app/mapping/MapPresets.ts
[layerpanel]: ../../frontend/src/app/mapping/LayerPanel.tsx
[layerrow]: ../../frontend/src/app/mapping/LayerRow.tsx
[usemaplayer]: ../../frontend/src/app/mapping/UseMapLayer.ts
[questions]: ../../frontend/src/app/mapping/QuestionList.tsx
[overlays]: ../../frontend/src/app/mapping/MapOverlays.tsx
[spotcard]: ../../frontend/src/app/mapping/SpotCard.tsx
[insights]: ../../frontend/src/app/mapping/townInsights.ts
[buildable]: ../../frontend/src/app/mapping/buildableOverlay.ts
[colors]: ../../frontend/src/app/mapping/layerColors.ts
[jurisdiction]: ../../frontend/src/app/mapping/jurisdictionMatch.ts
[spatial]: ../../frontend/src/app/mapping/spatialScope.ts
[geoutils]: ../../frontend/src/app/mapping/geoUtils.ts
[townnames]: ../../frontend/src/app/mapping/townNames.ts
[munis]: ../../frontend/src/app/mapping/useMunicipalities.ts
[css]: ../../frontend/src/app/mapping/explorer.module.css
[zoningpage]: ../../frontend/src/app/mapping/zoning/page.tsx
[distribution]: ../../frontend/src/app/mapping/DistributionCard.tsx
[vtmap]: ../../frontend/src/components/mapping/index.tsx
[details]: ../../frontend/src/components/mapping/FeatureDetails.tsx
[legend]: ../../frontend/src/components/Legend/index.tsx
[filterredux]: ../../frontend/src/components/FilterRedux/
