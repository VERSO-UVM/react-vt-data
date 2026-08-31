"""
**Author**:
    Ian Sargent
**Created**:
    2026-07-10
** Updated**:
    2026-08-10
**Description**:
    This is the master orchestrating data scraping script.
    Running this document will call each individual category scraper
    and populate tables into the DuckLake's RAW schema.
"""

import argparse

from data_collection import (
    acs5,
    building_footprints,
    cdc,
    demographics,
    economic,
    education,
    fips,
    flood,
    historic_population,
    housing,
    qcew,
    wastewater,
    zoning,
)
from datastore.lake_build import insert_year, replace_table

# Datasets WITH year columns (longitudinal)
YEARLY_SCRAPERS = [acs5, demographics, economic, education, housing, qcew]

# Datasets WITHOUT year columns (static)
STATIC_SCRAPERS = [
    building_footprints,
    cdc,
    fips,
    flood,
    historic_population,
    wastewater,
    zoning,
]


def run_scraper(scraper, yearly=False, year=None):
    name = scraper.__name__.split(".")[-1]

    try:
        print(f"Running {name}...")

        if yearly:
            outputs = scraper.collect(year=year)
        else:
            outputs = scraper.collect()

        if not isinstance(outputs, dict):
            outputs = {name: outputs}

        for table_name, df in outputs.items():
            full_name = f"RAW.{table_name}"
            print(f"Loading {full_name}")
            # If the dataset is longitudinal, replace or append that year's data
            if yearly:
                insert_year(full_name, df, year)
            # If a static dataset, replace the whole table
            else:
                replace_table(full_name, df)

        print(f"Completed {name}")

    except Exception as e:
        print(f"Failed to write {name}: {e}")
        raise


def run_master_scrape(year: int):
    for scraper in YEARLY_SCRAPERS:
        run_scraper(scraper, yearly=True, year=year)

    for scraper in STATIC_SCRAPERS:
        run_scraper(scraper, yearly=False)


def main():
    # Accepts the year argument from justfile for collection
    parser = argparse.ArgumentParser()
    parser.add_argument("year", type=int)
    args = parser.parse_args()

    print(f"Collecting data for {args.year}")

    run_master_scrape(args.year)


if __name__ == "__main__":
    main()
