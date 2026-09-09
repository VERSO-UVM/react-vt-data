import pkgutil
from importlib import import_module

import data_cleaning as cleaning
from lake_build import get_connection


def get_cleaners():
    """
    Return all cleaning scripts in the backend/data_cleaning folder.
    """
    cleaners = []

    for _, module_name, ispkg in pkgutil.iter_modules(cleaning.__path__):
        if ispkg:
            continue

        # Don't accidentally import the master runner itself.
        if module_name == "run_cleaning":
            continue

        module = import_module(f"data_cleaning.{module_name}")

        if hasattr(module, "main"):
            cleaners.append(module)

    return cleaners


def run_master_clean():
    failed = []

    con = get_connection()

    try:
        for cleaner in get_cleaners():
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
    run_master_clean()


if __name__ == "__main__":
    main()
