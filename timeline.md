# Wrapping Backend

For now, Ian is taking point on this, with Fitz as a resource for questions as well as pitching in directly with development.

Precise due-dates to be elaborated.

## Phase 0 (complete)

- read up on fastapi

## Phase 1 (complete)

1. Hardcode wrap up getting the zoning data
   - store the geojson somewhere
   - make it accessible with api
   - host api
   - fetch from api in java
   - show data as already established
2. wrap up getting any mapping data from premade geojsons
   - do this if going to 3 feels hard
   - in other words, functionalize step 1 (on the python and js sides both)

## Phase 2 (on the way)

4. wrap up getting any mapping data **from dataframes**

   - make an API copy of the `masterload` function in app_utils.data_loading.py into
     - do this in a separate python

5. hardcode one filter as a toggle to the api (make api take a filter variable)
6. make the api _do something_ with that filter variable (and test that it plots correctly)
7. generalize so that it does _what we want_, that is, using the actual filtering code that already exists (and test that it plots correctly)

## Phase 3

8. Create a UI component that lets the user filter (or rather, adopt a previously existing one -- Mantine?)
9. hook up our ui component to the backend we built in phase 1 and 2.

# Data maintainability

## Phase 1

1. Ensure local copies of all data
2. Setup pipelines to automatically load, and clean data to our specifications **if structure has not changed**

## Phase 2

3. Setup timelines to refresh data sets, with logic such that we fall back to stored datasets always
4. Extensive documentation for maintainability

# Proof of structure for Working Report

## Phase 0 (COMPLETE)

-[x] make some simple charts with recharts.js. -[x] define a initial version of metadata for charts -[x] define a renderer of that metadata -[x] handle metadata with saved states

## Phase 1 (broad features) (COMPLETE)

-[x] add functionality to add saved states from the report (TODO) -[x] add functionality to remove saved states from the report (TODO) -[x] add functionality to export the report/page in the form of a pdf

## Phase 2 (in progress reading from fast api to create charts)

- begin scaling up vocabulary of reports

## Phase 3 (eventual)

- construct default automated reports based on profiles
- make the metadata either directly accessible or something that we can save into some sort of profile or export that can then be imported back in

# Improvements and pretty

## Mapping

-[x] add base layers for counties and municpalities -[x] tooltips

- legends (this week)
- other structure
- styling

# Current week plans

## Ian

- ideate beyond POST for apis (can get get everything into GET)
- easier -- adding legends to the map
  - tougher -- work on hard-coded version of the existing charts to present them in tabular format
  * start with just making a component to show in tabular format
  * then wrap that component into the existing chart component
  * implement a button/switch (knowing that it will change and maybe not be wanted)

## Fitz

1. setup filters on java side for APIs
2. integrate filters more tightly with backend (propogate from backend?)
3. create a chart from api-call

## Bonus stuff
