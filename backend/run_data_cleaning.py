import argparse
import logging
import pkgutil
from importlib import import_module

import data_cleaning as cleaning
from lake_build import get_connection
from logger.logging import setup_etl_logging

logger = logging.getLogger(__name__)


def get_cleaners(script_name: str | None = None):
    """
    Return cleaning scripts in the backend/data_cleaning folder.

    If `script_name` is given, only the matching module is returned.
    """
    cleaners = []

    for _, module_name, ispkg in pkgutil.iter_modules(cleaning.__path__):
        if ispkg:
            continue

        if script_name and module_name != script_name:
            continue

        module = import_module(f"data_cleaning.{module_name}")

        if hasattr(module, "main"):
            cleaners.append(module)

    return cleaners


def run_master_clean(script_name: str | None = None):
    failed = []

    con = get_connection()

    try:
        cleaners = get_cleaners(script_name)

        if script_name and not cleaners:
            logger.error("No cleaner found matching '%s'", script_name)
            return

        for cleaner in cleaners:
            name = cleaner.__name__.split(".")[-1]
            logger.info("Running %s...", name)

            try:
                cleaner.main(con)
                logger.info("Completed %s", name)

            except Exception:
                failed.append(name)
                logger.exception("FAILED %s", name)

    finally:
        con.close()

    logger.info("Cleaning ETL process completed.")

    if failed:
        logger.error("Failed cleaners: %s", ", ".join(failed))
    else:
        logger.info("All cleaners completed successfully.")


def main():
    setup_etl_logging("clean")
    parser = argparse.ArgumentParser(description="Run data cleaning scripts.")
    parser.add_argument(
        "script_name",
        nargs="?",
        default=None,
        help="Name of a single data_cleaning module to run (e.g. "
        "clean_acs5_timeseries). Omit to run all.",
    )
    args = parser.parse_args()

    run_master_clean(args.script_name)


if __name__ == "__main__":
    main()
