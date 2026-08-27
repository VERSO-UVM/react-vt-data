# Motivation

- Clean and orderly code
- Replicable and testable processes
- Separation of concerns between:
  - collecting
  - cleaning
  - run-time query logic
    - subselection from tables written out
    - additional filtering of selections
  - serving
- cross-reference and filtering:
  - easily use filters from datasets that don't otherwise "talk" to each other, for example, getting a zoning and a flooding and a soil suitability and a population count all in the same place.
- LLM layering.
  - At some point we want to have an LLM that makes interacting with all this easier. Setting up default routes it can use to get data cleanly and easily will make it more efficient and reliable
- Reference: [Tidy Data](https://vita.had.co.nz/papers/tidy-data.pdf).

# Overview of Steps

0. **LAKE CREATION** If the DuckLake is not yet instanciated, the `just build-lake` justfile recipe will create the DuckLake instance, install the spatial extension, and establish both the `RAW` and `CLEANED` table schemas.

- Files called upon: [`backend/lake_build.py`](../../backend/lake_build.py)

1. **COLLECTION:** Data is collected from external sources within the [`backend/data_collection/`](../../backend/data_collection/) folder, with APIs preferred whenever available. Direct downloads and locally stored tables are used when an API is unavailable or does not provide the required data. Raw data is loaded into the DuckLake `RAW` schema with minimal transformations so that the original source data is preserved.

- The collection process is orchestrated using the `just get-data {start_year} {end_year}` justfile recipe, which collects data given the specified year range (inclusive).
- Files called upon: [`backend/run_data_collection.py`](../../backend/run_data_collection.py)
- Separate data file collectors live within [`backend/data_collection/`](../../backend/data_collection/)
  - [`acs5.py`](../../backend/data_collection/acs5.py) <!-- ACS-5 profiles in tidy format
  - [`base.py`](../../backend/data_collection/base.py) <!-- Utility functions for collectors
  - [`cdc.py`](../../backend/data_collection/cdc.py) <!-- CDC places data
  - [`demographics.py`](../../backend/data_collection/demographics.py) <!-- Demographics B-table
  - [`economic.py`](../../backend/data_collection/economic.py) <!-- Economics B-table
  - [`education.py`](../../backend/data_collection/education.py) <!-- Education B-table
  - [`fips.py`](../../backend/data_collection/fips.py) <!-- Vermont boundary-lines (local files)
  - [`flood.py`](../../backend/data_collection/flood.py) <!-- FEMA Flood Hazard
  - [`historic_population.py`](../../backend/data_collection/historic_population.py) <!-- VCGI Population Estimates (1791 - 2020)
  - [`housing.py`](../../backend/data_collection/housing.py) <!-- Housing B-table
  - [`qcew.py`](../../backend/data_collection/qcew.py) <!-- Quarterly Census of Employment and Wages (BLS)
  - [`wastewater.py`](../../backend/data_collection/wastewater.py) <!-- VERSO Wastewater data (on GitHub)
  - [`zoning.py`](../../backend/data_collection/zoning.py) <!-- VERSO Zoning data (on GitHub)

2. **CLEANING:** The raw data is cleaned, transformed, and standardized, analysis-ready datasets. This stage includes tasks such as normalizing column names and data types, handling missing or invalid values, reshaping data, creating derived variables, and establishing consistent geographic and temporal identifiers. The resulting datasets are stored as SQL tables in the DuckLake `CLEANED` schema.

   - Cleaning steps should be clearly documented in the corresponding `.py` cleaning script in the [`backend/data_cleaning/`](../../backend/data_cleaning/) folder.
   - The cleaning process is orchestrated using the `just transform-data` justfile recipe.
     Files called upon: [`backend/run_data_cleaning.py`](../../backend/run_data_cleaning.py)

- Separate data file cleaners live within [`backend/data_cleaning/`](../../backend/data_cleaning/)
  - [`clean_acs5.py`](../../backend/data_cleaning/clean_acs5.py) <!-- ACS-5 profiles in tidy format
  - [`clean_cdc.py`](../../backend/data_cleaning/clean_cdc.py) <!-- CDC places + edges
  - [`clean_demographics.py`](../../backend/data_cleaning/clean_demographics.py) <!-- Demographics B-table
  - [`clean_dependency_ratio.py`](../../backend/data_cleaning/clean_dependency_ratio.py) <!-- Age dependency ratio timeseries
  - [`clean_derived_time_series.py`](../../backend/data_cleaning/clean_derived_time_series.py) <!-- Timeseries tables (age, hh_income, etc.)
  - [`clean_economic.py`](../../backend/data_cleaning/clean_economic.py) <!-- Economics B-table
  - [`clean_education.py`](../../backend/data_cleaning/clean_education.py) <!-- Education B-table
  - [`clean_fips.py`](../../backend/data_cleaning/clean_fips.py) <!-- Vermont boundary-lines
  - [`clean_flood.py`](../../backend/data_cleaning/clean_flood.py) <!-- FEMA Flood Hazard
  - [`clean_historic_population.py`](../../backend/data_cleaning/clean_historic_population.py) <!-- VCGI Population Estimates (1791 - 2020)
  - [`clean_health_insurance_coverage.py`](../../backend/data_cleaning/clean_health_insurance_coverage.py) <!-- Health Insurance (Public, Private, None)
  - [`clean_housing.py`](../../backend/data_cleaning/clean_housing.py) <!-- Housing B-table
  - [`clean_median_earnings.py`](../../backend/data_cleaning/clean_median_earnings.py) <!-- Median Earnings (Male, Female, All Workers)
  - [`clean_qcew.py`](../../backend/data_cleaning/clean_qcew.py) <!-- Quarterly Census of Employment and Wages (BLS)
  - [`clean_snapshot.py`](../../backend/data_cleaning/clean_snapshot.py) <!-- Selected summary metrics to display on the "Analyze" page
  - [`clean_wastewater.py`](../../backend/data_cleaning/clean_wastewater.py) <!-- VERSO Wastewater data
  - [`clean_zoning.py`](../../backend/data_cleaning/clean_zoning.py) <!-- VERSO Zoning data

3. **LOADING:** `CLEANED` DuckLake tables are loaded into a DuckDB database named [`backend/Data/warehouse.duckdb`](../../backend/Data/warehouse.duckdb), where the API routes point to.

- The loading process is orchestrated using the `just load-data` justfile recipe, which calls upon the [`backend/run_data_loading.py`](../../backend/run_data_loading.py) script.

_**NOTE:**_ The entire ETL process can be run with the `just run-etl {start_year} {end_year}` justfile recipe

4. **QUERY and FILTER:** The tables in [`warehouse.duckdb`](../../backend/Data/warehouse.duckdb) are queried through Python functions that define the data returned to the application. These functions handle joins, aggregation, reshaping, time-series construction, and other transformations required to produce frontend-ready data.

   - Filtering and the structure of available data are defined in reference to [`backend/api/schema.json`](../../backend/api/schema.json).
   - The schema establishes the fields and filter dimensions that can be requested by the frontend.
   - The corresponding route and query functions demonstrate how these fields are translated into SQL filters and applied to the cleaned datasets.

5. **API:** FastAPI provides a thin interface between the frontend and the query layer. API routes validate incoming requests, pass filters and parameters to the appropriate Python query functions, and return the resulting data in the format expected by the frontend.

   - Business logic and data manipulation should remain in the query layer rather than in the API routes.
   - The API is therefore primarily responsible for request validation, routing, and response formatting.

**In summary:** the VDC pipeline follows a **COLLECTION → CLEAN → LOAD → QUERY/FILTER → API** architecture. Raw external data is preserved in `RAW`, transformed into documented and analysis-ready tables in `CLEANED`, `LOADED` into a database, `QUERIED` through reusable Python functions, and exposed to the frontend through a thin FastAPI layer.

# Schema

The schema governs filtering and joining. It is laid out as follows:

- target_table (formerly primary dataset): the dataset to be joined onto. falls back to "default." This what the 'main logic' is done to in the SELECT clause of the SQL query.
  - filter_table (formerly secondary dataset): the dataset we're using to filter the primary dataset
    - join_key: the column to join on. see `FilterSource` in [`backend/api/models/request_models.py`](../../backend/api/models/request_models.py)
    - join_type: what type of join, either SQL standard (eg left) or spatial
    - value_col: the column where data _values_ are stored.
    - var_col: the column where _variable names_ are stored.
    - columns: ORDERED {label, column} pairs. The order is the filter cascade order; the label is what frontend shows; the column is what is sent back to the sql
    - range: if the final value shouldn't be a set of categories, but instead a numerical range, then it goes in this column.

Note that value_col and var_col both are premised on the idea that the dataset is in a **tidy** format: one row per observation, with variable in the 'discriminator; column.

# Future

If needed, the scheme can at some point be updated to instead type each column in the ordered column list, or something like that. The hope is that the schema can hold only the "hand controlled" meta data, and that some other function can actually define/type the columns, etc., so that, for example:

- boolean columns are grouped and returned by checkbox
- category columns are grouped and returned by cascade

## Example

We want to _generate_ something like the below.

```
{
  "zoning_full": {
    "join_key": "OBJECT_ID",
    "join_type": "inner",
    "columns": {
      "County":         { "col": "County",          "type": "category", "group": "district" },
      "Jurisdiction":   { "col": "Municipal_Name",   "type": "category", "group": "district" },
      "District Type":  { "col": "District_Type",    "type": "category", "group": "district" },

      "ADU Allowed":           { "col": "ADU_Allowance",                  "type": "bool", "group": "allowance" },
      "PUD Allowed":           { "col": "PUD_Allowance",                  "type": "bool", "group": "allowance" },
      "Affordable Allowed":    { "col": "Affordable_Housing_Allowance",   "type": "bool", "group": "allowance" },

      "Elderly Only (ADU)":    { "col": "ADU_Elderly_Housing_Only",       "type": "bool", "group": "occupancy" },
      "Owner-Occupied (ADU)":  { "col": "ADU_Owner_Occupancy_Required",   "type": "bool", "group": "occupancy" },

      "Max Height (F2F)":      { "col": "F2F_Max_Height",   "type": "range", "group": "dimensional" },
      "Min Lot Size (F2F)":    { "col": "F2F_Min_Lot_Size", "type": "range", "group": "dimensional" }
    }
  }
}
```
