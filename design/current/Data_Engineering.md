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
    * At some point we want to have an LLM that makes interacting with all this easier. Setting up default routes it can use to get data cleanly and easily will make it more efficient, token-wise, for helping people. 

# Overview of  Steps
1. COLLECTION: data is collected, either in direct download or via an API or scrape. API is preferred.
2. BUILD: data is processed into a clean dataset and stored in SQL tables.
    * how these decisions are arrived in light of the data should be well articulated in the corresponding `.qmd` in the notebooks folder. 
3. QUERY: queries are built for the data in SQL and wrapped up in python functions. This is how the data tables are manipulated to serve the precise data the frontend needs.
4. API: thin wrapper of fastapi stuff around the queries.



# Assignment
1. 