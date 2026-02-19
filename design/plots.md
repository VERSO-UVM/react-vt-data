# Plot and Visualization Reference

Each entry describes: what data it displays, how the data is shaped when it arrives, what the component does with it, and any user-facing interactions.

---

## Table Charts (ACS-5 data)

These are the primary display mode for Census / ACS-5 data. They use `subtype` values that begin with `renderTable`, which signals `ChartCard` to default to table view and optionally attach a trend chart.

### `renderTable` — Demographics % / Education % / Labor Force %
**Component:** `DemographicsTable.renderTable`
**Data shape:** tidy long format — one row per `(year, Variable, Percent)`. The table component pivots this to a `Variable × Year` grid, showing percent values with year columns.
**Interaction:** `ChartCard` shows a Chart/Table toggle. Table view is default; Chart view loads the associated trend chart (if `trendChart` is wired).

### `renderTableEstimates` — Demographics value / Education value / Income / Housing value
**Component:** `DemographicsTable.renderTableEstimates`
**Data shape:** same tidy long format but `Value` column instead of `Percent`. Rendered as a `Variable × Year` pivot of raw counts/dollar amounts.

### `renderTableMixed` — Housing Stock & Value
**Component:** `DemographicsTable.renderTableMixed`
**Data shape:** same tidy long format; some variables are counts (`Total Housing Units`, `Renter-Occupied Units`) and one is a dollar value (`Median Home Value`). The mixed renderer applies per-variable formatting.

---

## Trend Charts (paired with table items)

These only render when a table-primary `ChartItem` is toggled to Chart view. They read the same raw `ChartItem.data` that the table does, but re-shape it internally.

### `DemographicsTrendChart`
**Variables:** `Under 18` (direct) and `65+` (sum of `65 to 74` + `75 Plus`).
**Plot:** dual-line `LineChart` (Recharts) over survey years. Y-axis in percent.
**Why these two:** they are the key age-dependency indicators for rural Vermont planning — shrinking youth cohort vs. growing elderly cohort.

### `EducationTrendChart`
**Variables:** `No High School Diploma`, `High School Graduate`, `Associate's Degree`, `Bachelor's Degree`, `Postgraduate Degree` (excludes `Some College, No Degree` to reduce clutter).
**Plot:** five-line `LineChart`, each with a distinct color. Y-axis in percent.

### `HousingTrendChart`
**Variables:** `Total Housing Units` (left axis, count), `Renter-Occupied Units` (left axis, count), `Median Home Value` (right axis, dollars).
**Plot:** three-line `LineChart` with dual Y-axes. Left axis formatted with `toLocaleString()`; right axis in `$Xk`.

---

## Employment Area Chart

### `EmploymentAreaChart`
**Source:** BLS QCEW quarterly data (`backend/Data/QCEW/vt_qcew_employment.parquet`).
**API endpoint:** `POST /load/qcew/employment` with optional `{ County }` filter.
**Data shape received:** wide format — one row per `quarter_label` (e.g. `2019Q3`), one column per sector (4-quarter moving average employment count). Sectors in stacking order: Goods-producing, Trade/Transport/Utilities, Education & Health, Leisure & Hospitality, Professional & Business, Information & Financial, Government, Other Services.

**Why 4QMA:** Quarterly employment is highly seasonal (ski resorts, agriculture, summer tourism). The four-quarter moving average smooths this to reveal structural trends.

**Three internal views** (toggled by `SegmentedControl` inside the component; outer Chart/Table toggle suppressed via `chartParams.noViewSwitch`):

| View | What it shows | Y-axis |
|------|--------------|--------|
| **Stacked** | `AreaChart` with each sector stacked; shows composition and total magnitude | `[0, auto]` |
| **Trend** | Single `Total` line (sum of all sector 4QMAs — exact because moving average is linear) | `[niceLo, niceHi]` — "nice" bounds: step chosen for ~5 ticks across the data range, bottom one step below min, top rounded up |
| **Table** | Mantine `Table`, newest quarter first, sector columns + computed Total | scrollable |

**Trend Y-axis algorithm:** `range / 5 → rough step → round to 1/2/5 × 10^n → lo = (floor(min/step) - 1) × step, hi = ceil(max/step) × step`. For min=11,262, max=15,086 this yields `[10,000, 16,000]`.

---

## Bar Charts

These serve categorical comparison data (e.g., zoning district types, housing tenure).

### `SamePerXBarChart`
Single-location bar chart. `xField` is the category axis; `yField` is the value. One bar per category.

### `DiffPerXBarChart`
Difference bar chart — shows the delta between primary and comparison location for each category. Bars above zero mean the primary is higher; below zero means lower.

### `CompareDiffPerXBarChart`
Grouped bar chart with two bars per category: primary location and comparison location side by side. Used for zoning acreage and housing tenure comparisons. `chartParams.legendLabels` provides the two series labels.

---

## Maps

All maps use **Deck.gl `GeoJsonLayer`** inside a **Maplibre-GL** base map (CartoDB Positron). The `VTMap` component (`components/mapping/index.tsx`) reads `d.properties.rgba_color` (`[R, G, B, A]`) for fill color and `d.properties.tooltip` for the hover panel. A municipality-boundary overlay can be toggled.

### Zoning Map (`/mapping/zoning`)
**Data:** VT zoning districts from VCGI, cleaned and deduplicated.
**Color:** `add_fill_colors(gdf, column="District Type", cmap="tab20")` — one color per district type category (up to 20 via `tab20`).
**Filter panel:** hierarchical County → Jurisdiction filter built from `FilterState`; POST to `/load/mapping/zoning` re-fetches filtered GeoJSON.
**Tooltip:** District Type, Acres, Jurisdiction.

### Flood Insurance Map (`/mapping/flood-legal`)
**Data:** FEMA National Flood Hazard Layer, pre-processed; only SFHA polygons (`SFHA_TF == "T"`) are included.
**Color:** orange → red gradient by zone type, applied at serve time:
| Zone | Meaning | Color |
|------|---------|-------|
| A    | High-risk, no BFE | amber `[255, 140, 0, 195]` |
| AE   | High-risk with BFE (most common, ~80 % of polygons) | orange-red `[230, 60, 0, 205]` |
| AH   | Shallow ponding | dark red `[200, 20, 0, 195]` |
| AO   | Sheet flow | orange `[255, 110, 0, 195]` |
**No filter panel:** single GET load of the whole state.
**Tooltip:** Zone, Additional Info (subtype).

### Soil Suitability Map (`/mapping/soil-suitability`)
**Data:** VT wastewater / septic suitability layer, loaded per Regional Planning Commission (RPC) region.
**Color:** set by the backend loader; suitability classes get distinct colors.
**Filter panel:** RPC selector dropdown; selecting triggers a GET to `/load/mapping/wastewater/soil_septic/{rpc}`.

---

## Notes on the ChartCard Wrapper

All chart components above are wrapped by `ChartCard` (`components/Charts/index.tsx`), which provides:
- **Category badges** — filled (green) when the chart's category matches a profile interest
- **View toggle** — Chart ↔ Table (suppressed when `chart.chartParams.noViewSwitch` is set)
- **Save button** — pushes the `ChartItem` snapshot into the Zustand `ItemsProvider` store
- **Metadata footer** — `chart.metadata.source` shown as grey caption
