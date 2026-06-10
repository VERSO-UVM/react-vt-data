# Data Pipeline — End-to-End Arc

## Overview

```
External Sources
   ↓ (scrapers / API clients in backend/data_collection/)
Raw Files  (CSV, Parquet, FlatGeobuf, GeoJSON)
   ↓ (pandas / geopandas cleaning, color, tooltip utilities)
Processed Files  stored in backend/Data/
   ↓ (FastAPI routes, DuckDB views, geopandas loaders via masterload())
HTTP Response  (JSON / GeoJSON with rgba_color, tooltip fields pre-attached)
   ↓ (axios POST FilterRequest or GET in frontend useApplyFilters)
ChartDef  →  createChartItem()  →  ChartItem  (Zustand / local state)
   ↓ (ChartStack dispatches on subtype)
Render  (Recharts line/bar/area, Deck.gl GeoJsonLayer, Mantine Table)
   ↓ (user clicks "Add to Report")
ItemsProvider  (Zustand store, persisted to localStorage)
   ↓ (/working-report page re-renders saved ChartItems)
PDF export  via html2pdf.js
```

## Stage Details

### 1. Data Collection — `backend/data_collection/`
Each dataset has a dedicated scraper or download script:
- **QCEW** (`qcew.py`): hits the BLS public API quarterly by county/NAICS; computes a four-quarter moving average (`employment_4qma`) per sector; writes `Data/QCEW/vt_qcew_employment.parquet`.
- **Census ACS-5** (`acs5_db.py`): pulls five-year estimates from the Census API for demographics, education, housing, income, labor force; writes per-topic tidy parquets under `Data/Census/ACS_5/`.
- **FEMA flood data**: downloaded as a shapefile/GeoJSON; pre-processed once and saved to `frontend/public/data/flood-legal.json`.
- **Zoning**: sourced from VCGI; loaded as FlatGeobuf/GeoJSON.
- **Soil suitability / wastewater**: GeoJSON/FGB per RPC region.

### 2. Cleaning & Processing — `backend/app_utils/`
Domain modules (`flooding.py`, `zoning.py`, `demographic.py`, etc.) apply:
- Column selection, renaming, and type coercion
- `add_fill_colors()` / `add_flood_color()` → attaches an `rgba_color` list `[R, G, B, A]` to each feature, consumed directly by Deck.gl's `GeoJsonLayer`
- `add_tooltip_from_dict()` → attaches a structured `tooltip` dict (with a `__title__` key) that the frontend renders on hover
- `split_name_col(keep_name=True)` → splits ACS `NAME` column into `Jurisdiction` + `County` for filter hierarchies, preserving the raw `NAME` for API queries

Parquet is the preferred format for tabular data (DuckDB-friendly). GeoJSON / FlatGeobuf for spatial layers.

### 3. API — `backend/api/`
FastAPI app (`api/main.py`) with two router groups:

**GET routes** (`api/routes/get_routes/`):
- `/load/mapping/{dataset}` — calls `masterload(name)` which hits a LOADERS dict of lazy loader functions; results are cached in `_DATA_CACHE`; returns GeoJSON
- `/load/mapping/{dataset}/filters` — builds a `FilterState` tree from the dataset for the hierarchical filter UI

**POST routes** (`api/routes/post_routes/`):
- Accept a `FilterRequest` body `{ filters: { County: [...], ... }, extraParams: {...} }`
- ACS routes (`post_census.py`) query a DuckDB connection over the tidy parquets; return `APIResponse { data, tableData, metadata }`
- QCEW route (`post_qcew.py`): pivots the long-format parquet to wide (one row per quarter, one column per sector), rounds 4QMA values, returns JSON records

**Response model** (`api/models/response_models.py`): `APIResponse` with `data` (chart-ready records), `tableData` (optional raw records for table view), and `metadata` (source, county, year range, etc.).

### 4. Frontend Request — `frontend/src/components/FilterUI/useApplyFilters.ts`
`useApplyFilters()` is a hook that wraps axios POST/GET calls. Callers pass:
- `url` — the API endpoint
- `filters` — built by `buildFilters(location)` from the selected profile location
- optional `filterKey` / `dataKey` — dot-path accessors into the response if the data is nested
- a callback `(data, metadata, tableData) => void`

The hook fires on profile location changes and fills per-chart state in the data-viewer page.

### 5. ChartDef → ChartItem
`ChartDef` (in `components/Charts/configs/ChartDefs.tsx`) is a static config object:
```ts
{ id, title, subtype, url, xField, yField, categories, chartParams, showCols, tableConfig }
```

The data-viewer page maps each def to a live `ChartItem` via `createChartItem()` / `createTableItem()` from `utils/itemFactory.tsx`. A `ChartItem` is a `ChartDef`-shaped object enriched with:
- `data[]` — records from the API
- `compareData[]` — same endpoint, different location
- `tableData[]` — optional separate table records
- `metadata` — source attribution, county, year range

### 6. Render — `components/Charts/`
`ChartStack` iterates `ChartItem[]` and dispatches to the right component via `allCharts[chart.subtype]` (self-import trick — every export from `index.tsx` is addressable by string key).

`ChartCard` wraps each component with:
- Category badges (filled when matching user interests)
- View toggle — Chart / Table (suppressed via `chartParams.noViewSwitch` for components with their own internal toggle, e.g. `EmploymentAreaChart`)
- Add/Remove button for the working report

See `design/plots.md` for per-component details.

### 7. Save — `components/ItemsProvider/index.tsx`
A Zustand store persisted to `localStorage`. Users click "Add to Report" on any `ChartCard`; the `ChartItem` (including its data snapshot) is pushed into the store. The working report page reads this store and renders all saved items.

### 8. Export — `app/working-report/page.tsx`
Renders saved items in a print-friendly layout. `html2pdf.js` captures the DOM as a PDF — no server-side rendering involved. The user can remove items or reorder before exporting.

---

# Overall Vision
The Vermont Data Collaborative portal is a website with three main pieces of functionality: data storage and access, data training, and data analysis. Designed in close partnership with stakeholders in the private sector, professional government, and citizen government, it aims to help Vermonters find and use the data they need to make their work easier and more effective.

## Users and Uses
1. Professional Governmental: won't replace existing power tools, but might help reference data from different domains and help reduce siloing
    * Regional Planning Commissions and Regional Development Commissions
    * Potentially legistlators or other legislative staff
2. Private Sector:
    * Developers: targeting proposal sites
3. Citizen government: 
    * Select boards: customizing autogenerated reports to produce overview of towns; identifying data to support grant applications
    * Reporters: identifying stories and gathering background data to support them

## Rollout Steps
1. VERSO students build a prototype of the portal in streamlit (python), focusing on the core data visualization features. Ad-Hoc individual feedback sessions with community leaders (RPC heads, VLCT heads) and conversational statements of interest drive initial functionality.
2. UVM faculty and SMEs review and update a stable version of the prototype and begin more detailed design of the eventual final version.
3. The advisory council review the stable prototype, with an emphasis on potential indicators of interest and key functionality going forward.
4. VERSO students collate and organize feedback and confer with UVM faculty and SMEs
5. VERSO students begin work on second version of product, now built in javascript.
6. Second round of feedback... 
7. Continue iterating on product...
8. Broader go live....
9. VERSO students organize SOPs for updates and maintenance in the future.

## Technical Steps
#### Phase 1: prototyping
1. Rough prototyping in streamlit
2. Modularize streamlit; improve caching speed and add additional functionality
3. Begin decoupling front-end and back-end
---- Feedback

#### Phase two: local host
1. Construct initial setup of frontend (without data) on local host.
2. Fully integrate fastAPI into backend, hooking up test connections to frontend as you go.
3. Replicate all prototype functionality (with feedback improvements) on javascript local host
4. Add additional functionality that javascript affords: multi-layer mapping, exporting
5. Bugfixes, render stable version
---- Feedback

#### Phase three: server
1. Containerize and test containers on local host.
2. Acquire server, set up SSH and basic infrastructure
3. migrate code to server and setup dockers, etc.
4. stability and bughunt 
---- QA and additional feedback
5. Go live
6. Organize SOPs for maintenance

#### Phase four: extensions and maintenance
* update caching
* update database (see below)
* allow for user uploads
* add additional requested functionality

# Main Architecture
The website consists of two containerized modules--a backend for data processing and a frontend for a user interface and display. 
## Frontend
The frontend is a javascript website designed for easy use by a non-technical user.
#### Stack
`React` and `Next.js` do the majority of the work, with additional custom html and css along the edges. We may include some `D3.js` if others write it, too.
#### Functionality
* trainings and video walkthroughs for how to use it
* feedback and data requests
* exploratory data visualization and low-level analysis, including exports
* raw data exports
* customizable auto-generated reports for counties, RPCs, and municipalities, both general and by subject area.
* working with separate data areas in the same interface (eg, mapping).
	* including filtering
#### User Interface
* Navigation
* Dashboards
* Interactive Maps
* Report generation and customization (ability to add user created visuals into report seamlessly)
* Clear data sourcing and caveats concerning quality
## Backend
The backend for the website consists largely of data manipulation in python.
#### Stack
Python: FastAPI, pandas, geopandas, pyogrio
#### Functionality
* Data cleaning and processing
* Data filtering from frontend requests
* serving JSON/GeoJSON to frontend
* ability to cleanly include new data sources
* allow cross-referencing between datasets based on
	* geography: intersection, containment, etc.
	* names: codes, full names
####  Optimization
If performance becomes a concern, VERSO students take the following actions:
- improve backend caching: use the `moka.py` library.
- upgrade the database querying: switch from csv files to a postgreSQL database (see below)


# Supporting Architecture

##  Database
#### Phase one
- Data stored as CSV, parquet, FGB, or GeoJSON on a mounted volume accessible to the backend container
- Automatic update scripts handle cleaning, versioning, and validation
- Organized by data domain with accompanying metadata
#### Phase two (optional)
- Data stored in PostgreSQL/PostGIS for scalable, queryable storage
- Backend queries database instead of reading files directly
- Designed later, if required\
## Containerization
- The frontend and backend are containerized using Docker Compose. 
- These containers are built on a server, probably AWS, using SSH

## Security 
- Server accessed via SSH only
- containers isolated; no direct access to external data
- open source data eliminated need for user authentication


# Miscellaneous Comments
## Authorization and Access
All data is intended to be open source and fully accessible. This both meets open source goals, meets public interest, and makes our jobs easier by not having to implement authorization protocols, etc. 

## Maintenance and Updates
Because there are no user roles, e.g., administrators, all maintenance and updates must be done in a coding environment. This puts an extra emphasis on making the code as modular, extensible, and clear as possible. In addition, VERSO students and SMEs will put together SOPs for maintenance and updates for future staff. 


# Extensions
## User uploaded data
This the additional work and extensions required to securely allow user uploads for temporary sessions. 
- **Backend**
    - Create an endpoint in FastAPI to accept file uploads.
    - Validate file type, size, and structure before processing.
    - Isolate each user’s upload in a separate folder or temporary storage. Does not go to database.
    - limit file size -- just goes in cache, we don't stor
- **Database**
    - Data is not stored in central database.
- **Security**
    - Sanitize file names and paths.
    - Limit executable content to prevent code injection.
    - Optionally run processing in a sandboxed environment or container.
- **UI**
    - Provide a simple “Upload Data” form.
    - Show feedback if the upload fails or data is invalid.
    - Allow users to interact with their data alongside portal datasets.
- **Containerization**
	-  HTTPS: 
		- Run a reverse proxy in front of Docker containers (caddy)
		- Obtain SSL certificate
		- route all HTTP traffic to HTTPS