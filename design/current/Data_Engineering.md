# Motivation

* Clean and orderly code 
* Replicable and testable processes
* Separation of concerns between:
    * collecting
    * cleaning 
    * run-time query logic 
        * subselection from tables written out 
        * additional filtering of selections 
    * serving
* cross-reference and filtering:
    * easily use filters from datasets that don't otherwise "talk" to each other, for example, getting a zoning and a flooding and a soil suitability and a population count all in the same place. 
* LLM layering. 
    * At some point we want to have an LLM that makes interacting with all this easier. Setting up default routes it can use to get data cleanly and easily will make it more efficient and reliable
* Reference: [Tidy Data](https://vita.had.co.nz/papers/tidy-data.pdf). 

# Overview of  Steps

1. COLLECTION: data is collected, either in direct download or via an API or scrape. API is preferred.
2. BUILD: data is processed into a clean dataset and stored in SQL tables.
    * how these decisions are arrived in light of the data should be well articulated in the corresponding `.qmd` in the notebooks folder, with ample code included. 
3. QUERY and FILTER: 
    * queries are built for the data in SQL and wrapped up in python functions. This is how the data tables are manipulated to serve the precise data the frontend needs.
    * Filtering is done in reference to `backend/api/schema.json`
        * see the [schema](#schema) section below for an explanation of fields
        * see `backend/api/routes/get_routes/get_filters.py` and `backend/api/routes/get_routes/get_filters.py` for how those fields are used in practice. 
4. API: thin wrapper of fastapi stuff around the queries.


# Schema

The schema governs filtering and joining. It is laid out as follows:


* primary dataset: the dataset to be joined onto. falls back to "default." This what the 'main logic' is done to in the SELECT clause of the SQL query.
    * secondary dataset: the dataset we're using to filter the primary dataset
        * join_key: the column to join on. see FilterSource in request_models.py
        * join_type: what type of join, either SQL standard (eg left) or spatial
        * columns: ORDERED {label, column} pairs. The order is the filter cascade order; the label is what frontend shows; the column is what is sent back to the sql