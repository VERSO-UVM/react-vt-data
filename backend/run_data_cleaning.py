from importlib import import_module
from pathlib import Path
import pkgutil

import ETL.data_cleaning as cleaning


def get_cleaners():
    """
    Return all cleaning scripts in ETL.data_cleaning.
    """
    cleaners = []

    for _, module_name, ispkg in pkgutil.iter_modules(cleaning.__path__):
        if ispkg:
            continue

        # Skip private/helper modules
        if module_name.startswith("_"):
            continue

        module = import_module(f"ETL.data_cleaning.{module_name}")

        # Only include modules that expose a main() function
        if hasattr(module, "main"):
            cleaners.append(module)

    return cleaners


def run_master_clean():
    for cleaner in get_cleaners():
        print(f"Running {cleaner.__name__.split('.')[-1]}...")
        cleaner.main()
        print(f"Completed {cleaner.__name__.split('.')[-1]}")


def main():
    run_master_clean()


if __name__ == "__main__":
    main()