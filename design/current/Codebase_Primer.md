# Backend

Data acquisition, processing, hosting, run-time logic.

## Data

The Data folder. Probably can do with a little cleaning.

_Processed holds data _after_ it goes through the build scripts. Only parquet files should live here so that duckdb can read them into SQL with one pattern.

The tables get automatically named "{folder}_{table}", so that

`Data/_Processed/zoning/info.db` gets turned into a table accessed with `zoning_info` in sql.

## Code Folders

1. api: all fastapi code serving data to frontend. this is restricted to API stuff largely -- complicated runtime data logic should live in the `query` folder.
   1. models: the data models requested and served
   2. routes: the actual data routes
      1. get: simple string argument routes. Whole data sets and filter-trees for the frontend UI.
      2. post: more complicated data-model argument routes. Where filtering happens.
   3. `schema.json`: where all filter tree columns are, as well as information for joining
   4. `main.py` runs the actual API instance, and should be run from the terminal using `uvicorn`.
2. build:
   - scripts that clean data and turn in sql tables (as parquet files)
   - script that converts parquet files into a permanent .db file
3. data_collection: scripts that scrape or request raw datasets from external sources
4. logger: logging code and logs
5. notebooks: `.qmd` walkthroughs explaining data decisions: cleaning, table parsing, trying out filtering techniques, etc.
6. query: holds all the SQL scripts (specific) and python functions (general) that handle request information from the frontend.
7. `environment.yml`: the yaml folder for build a conda environment that can run all the backend code. Probably way too big at this point.
8. app-utils: legacy code to be migrated over to either build or query, and ported as much as possible into SQL. Eventually this will be deleted.

# Design

Where design documents live. You should feel free to make stuff here as needed. I pushed all the out-of-date stuff to the archive folder.

# Frontend

We won't get as into the weeds here. Most of this is handled by `next.js` and `npm`, the javascript/typescript library and package manager that help convert what we write into an actual website.

## Public

1. data: sources to be moved to the API eventually.
2. images: icons, etc

## src

The actual frontend typescript code.

1. App contains the pages themselves, one folder per each, as well as some overall css and layout stuff.
2. components holds the react components -- the functions, basically -- that are used _across_ pages.
3. contexts just holds some PDF stuff that is like 50% ai slop; tread lightly
4. data: light, hardcoded data. Currently just some names. could maybe go to API too.
5. lib -- big projects that are imported right in.
6. markdown -- a place to store any markdown you want to show anywhere.
7. utils -- a bit sloppy for now, a place to turn some items into others.
