import argparse
import pkgutil
from importlib import import_module

import data_cleaning as cleaning
from lake_build import get_connection


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
            print(f"No cleaner found matching '{script_name}'")
            return

        for cleaner in cleaners:
            name = cleaner.__name__.split(".")[-1]
            print(f"Running {name}...")

            try:
                cleaner.main(con)
                print(f"Completed {name}")

            except Exception as e:
                failed.append(name)
                print(f"FAILED {name}: {e}")

    finally:
        con.close()

    print("\nCleaning ETL process completed.")

    if failed:
        print(f"Failed cleaners: {', '.join(failed)}")
    else:
        print("All cleaners completed successfully.")


def main():
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
