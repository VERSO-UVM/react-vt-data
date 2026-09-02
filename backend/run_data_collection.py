import argparse
from datetime import datetime

from data_collection import (
    acs5,
    ambulance,
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
from lake_build import get_connection, insert_year, replace_table

YEARLY_SCRAPERS = [
    acs5,
    demographics,
    economic,
    education,
    housing,
    qcew,
]

STATIC_SCRAPERS = [
    ambulance,
    cdc,
    fips,
    flood,
    historic_population,
    wastewater,
    zoning,
]

MAX_YEAR = datetime.now().year - 1


def run_scraper(
    scraper,
    con,
    yearly: bool = False,
    years: range | None = None,
):
    """Run a scraper and write its output to DuckLake."""
    name = scraper.__name__.split(".")[-1]

    print(f"Running {name}...")

    if yearly:
        if years is None:
            raise ValueError(f"No years provided for yearly scraper {name}.")
        outputs = scraper.collect(years)
    else:
        outputs = scraper.collect()

    if not isinstance(outputs, dict):
        outputs = {name: outputs}

    for table_name, df in outputs.items():
        full_name = f"RAW.{table_name}"
        print(f"Loading {full_name}")

        if yearly:
            insert_year(full_name, df, years, con=con)
        else:
            replace_table(full_name, df, con=con)

    print(f"Completed {name}")


def run_master_scrape(
    start_year: int = 2009,
    end_year: int = MAX_YEAR,
):
    """Run all data collection scrapers."""
    years = range(start_year, end_year + 1)
    con = get_connection()
    failed = []

    try:
        for scraper in YEARLY_SCRAPERS:
            name = scraper.__name__.split(".")[-1]
            try:
                run_scraper(scraper, con=con, yearly=True, years=years)
            except Exception as e:
                failed.append(name)
                print(f"FAILED {name}: {e}")

        for scraper in STATIC_SCRAPERS:
            name = scraper.__name__.split(".")[-1]
            try:
                run_scraper(scraper, con=con, yearly=False)
            except Exception as e:
                failed.append(name)
                print(f"FAILED {name}: {e}")

    finally:
        con.close()

    print("\nData collection process completed.")
    if failed:
        print(f"Failed scrapers: {', '.join(failed)}")
    else:
        print("All scrapers completed successfully.")


def main():
    """Run the master scraper from the command line."""
    parser = argparse.ArgumentParser()
    parser.add_argument("start_year", type=int)
    parser.add_argument("end_year", type=int)
    args = parser.parse_args()

    if args.start_year > args.end_year:
        raise ValueError(
            f"start_year ({args.start_year}) cannot be greater than end_year ({args.end_year})."
        )

    print(f"Collecting data from {args.start_year} to {args.end_year}")

    run_master_scrape(
        start_year=args.start_year,
        end_year=args.end_year,
    )


if __name__ == "__main__":
    main()
