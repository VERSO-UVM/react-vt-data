import pkgutil
from importlib import import_module

import data_cleaning as cleaning


def get_cleaners():
    """
    Return all cleaning scripts in the backend/data_cleaning folder
    """
    cleaners = []

    for _, module_name, ispkg in pkgutil.iter_modules(cleaning.__path__):
        if ispkg:
            continue

        module = import_module(f"data_cleaning.{module_name}")

        # Only include modules that expose a main() function
        if hasattr(module, "main"):
            cleaners.append(module)

    return cleaners


def get_cleaner(module_name: str):
    """
    Return all cleaning scripts in the backend/data_cleaning folder
    """

    module = import_module(f"data_cleaning.{module_name}")
    return module


# def create_duckdb_version():
#     tables = con.execute(
#         """--sql
#         SELECT table_name
#         FROM duckdb_tables
#         WHERE database_name = 'lake'
#           AND schema_name = 'CLEANED'
#         """).fetchall()

# for table in tables


def run_master_clean():
    # for cleaner in get_cleaners():
    cleaner = get_cleaner("clean_wastewater")
    print(f"Running {cleaner.__name__.split('.')[-1]}...")
    cleaner.main()
    print(f"Completed {cleaner.__name__.split('.')[-1]}")


def main():
    run_master_clean()


if __name__ == "__main__":
    main()
