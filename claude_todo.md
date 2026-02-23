Write tests throughout to check. Commit after each second level change.

1. Goal: improve Data Export Page -- Make sure all of the below is firmly labeled as being in beta.
   1. Add UI for user to select
      - area (up to RPC/county)
      - sources (DP tables, B0100 tables, zoning information, soil suitability, etc)
      - when in doubt, make it easier to select _less_ data than more.
   2. Add functionality to return datasets _as csv_. EG, a parameter in duckdb apis that instead returns the frame as a csv, etc.
   3. Add limit processing
      - double check that each download is no more than a reasonable limit
      - limit total downloads for an IP Address to a reasonable limit per hour
      - build in such a way to allow potential infrastructure for eg catchpa or email or some sort of auth -- possibly registering an email and filling out the survey with that email.
      - instruct robots.txt that this data should not be scraped by them and would be more completely scraped from the primary sources (outline what those are, and how to properly get them).
