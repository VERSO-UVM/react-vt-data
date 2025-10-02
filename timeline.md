# Wrapping Backend

For now, Ian is taking point on this, with Fitz as a resource for questions as well as pitching in directly with development.

Precise due-dates to be elaborated.

## Phase 0

- read up on fastapi

## Phase 2

1. Hardcode wrap up getting the zoning data
   - store the geojson somewhere
   - make it accessible with api
   - host api
   - fetch from api in java
   - show data as already established
2. wrap up getting any mapping data from premade geojsons
   - do this if going to 3 feels hard
   - in other words, functionalize step 1 (on the python and js sides both)

## Phase 3

4. wrap up getting any mapping data **from dataframes**
   - make an API copy of the `masterload` function in app_utils.data_loading.py into
     - do this in a separate python

## Phase 4

5. hardcode one filter as a toggle to the api (make api take a filter variable)
6. make the api _do something_ with that filter variable (and test that it plots correctly)
7. generalize so that it does _what we want_, that is, using the actual filtering code that already exists (and test that it plots correctly)

## Phase 5

8. Create a UI component that lets the user filter (or rather, adopt a previously existing one -- Mantine?)
9. hook up our ui component to the backend we built in phase 1 and 2.

# Proof of structure for Working Report

## Phase 1

- building a pipeline to add stuff to a saved-state report
- adding in functionality to export the report/page in the form of a

## Phase 2

- automated reports split by:
  - area
  - topic
  - and more

# Improvements and pretty

## Mapping

- add base layers for counties and municpalities -- fitz
  - we can decide what they make the most sense to use later (or have toggle)
- tooltips
- legends
- other structure
- styling
