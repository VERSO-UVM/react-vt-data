import argparse
from datetime import datetime, timedelta, timezone

from data_collection import (
    acs5,
    acs5_tract,
    ambulance,
    building_footprints,
    cdc,
    demographics,
    economic,
    education,
    fips,
    flood,
    historic_population,
    housing,
    parcels,
    qcew,
    wastewater,
    zoning,
)
from lake_build import get_connection, insert_year, replace_table

YEARLY_SCRAPERS = [
    acs5,
    acs5_tract,
    demographics,
    economic,
    education,
    housing,
    qcew,
]

STATIC_SCRAPERS = [
    ambulance,
    building_footprints,
    cdc,
    fips,
    flood,
    historic_population,
    parcels,
    wastewater,
    zoning,
]

eastern_std_time = timezone(timedelta(hours=5))
MAX_YEAR = datetime.now(eastern_std_time).year - 1


def run_scraper(
    scraper,
    con,
    yearly: bool = False,
    years: range | None = None,
):
    """Run a scraper and write its output to DuckLake."""
    name = scraper.__name__.split(".")[-1]

    print(f"Collecting \033[1m{name}\033[0m data ...")

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
    scraper_name: str | None = None,
):
    """Run all data collection scrapers, or just one if `scraper_name` is given."""
    years = range(start_year, end_year + 1)

    yearly_scrapers = YEARLY_SCRAPERS
    static_scrapers = STATIC_SCRAPERS
    if scraper_name:
        yearly_scrapers = [
            s for s in YEARLY_SCRAPERS if s.__name__.split(".")[-1] == scraper_name
        ]
        static_scrapers = [
            s for s in STATIC_SCRAPERS if s.__name__.split(".")[-1] == scraper_name
        ]
        if not yearly_scrapers and not static_scrapers:
            print(f"No scraper found matching '{scraper_name}'")
            return

    con = get_connection()
    failed = []

    try:
        for scraper in yearly_scrapers:
            name = scraper.__name__.split(".")[-1]
            try:
                run_scraper(scraper, con=con, yearly=True, years=years)
            except Exception as e:  # noqa: BLE001
                failed.append(name)
                print(f"FAILED {name}: {e}")

        for scraper in static_scrapers:
            name = scraper.__name__.split(".")[-1]
            try:
                run_scraper(scraper, con=con, yearly=False)
            except Exception as e:  # noqa: BLE001
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
    parser.add_argument(
        "--only",
        default=None,
        help="Name of a single scraper to run (e.g. acs5_tract). Omit to run all.",
    )
    args = parser.parse_args()

    if args.start_year > args.end_year:
        raise ValueError(
            f"start_year ({args.start_year}) cannot be greater than end_year ({args.end_year})."
        )

    print(f"Collecting data from {args.start_year} to {args.end_year}")

    run_master_scrape(
        start_year=args.start_year,
        end_year=args.end_year,
        scraper_name=args.only,
    )


if __name__ == "__main__":
    main()
