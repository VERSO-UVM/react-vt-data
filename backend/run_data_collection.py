from datastore.lake_build import replace_table
from ETL.data_collection import (
    acs5,
    cdc,
    demographics,
    economic,
    education,
    flood,
    historic_population,
    housing,
    qcew,
    wastewater,
    zoning,
)

# Cleaning scripts to run. 
# You can comment out any ones you don't want to run below
DATA_CATEGORIES = [
    # acs5,
    # cdc,
    # demographics,
    # economic,
    # education,
    # flood,
    # historic_population,
    # housing,
    # qcew,
    wastewater,
    # zoning,
]


def run_master_scrape():
    """
    Run all data collection pipelines and load results into DuckLake.
    """

    for scraper in DATA_CATEGORIES:
        name = scraper.__name__.split(".")[-1]

        try:
            print(f"Running {name}...")

            outputs = scraper.collect()

            # Handle single dataframe
            if not isinstance(outputs, dict):
                outputs = {name: outputs}

            # Handle multiple tables
            for table_name, df in outputs.items():
                full_name = f"RAW.{table_name}"
                print(f"Loading {full_name}")
                replace_table(full_name, df)

            print(f"Completed {name}")

        except Exception as e:
            print(f"Failed {name}: {e}")


def main():
    run_master_scrape()


if __name__ == "__main__":
    main()
