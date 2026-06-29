"""
**Author**:
    Ian Sargent
**Created**:
    2026-06-15
**Description**:
    Build script to convert the acs5 tidy data files into SQL tables.
"""

from build import BACKEND, CON, data_dir

proc_dir = BACKEND / "Data" / "_Processed" / "acs5"


# functions:
def data_load():
    parquet_files = list((data_dir / "Census" / "ACS_5").glob("*.parquet"))
    for file in parquet_files:
        table_name = file.stem
        CON.execute(f"""
            CREATE OR REPLACE VIEW {table_name}_raw AS
            SELECT *
            FROM read_parquet('{file}')
        """)


def build_tables():
    parquet_files = list((data_dir / "Census" / "ACS_5").glob("*.parquet"))
    for file in parquet_files:
        table_name = file.stem
        CON.execute(f"""
            CREATE OR REPLACE TABLE {table_name} AS
            SELECT *
            FROM {table_name}_raw
        """)


def main():
    data_load()
    build_tables()
    proc_dir.mkdir(parents=True, exist_ok=True)
    tables = [
        "b10_census",
        "b15003_education",
        "b_economic",
        "b_housing",
        "dp_combined",
        "profile_census",
        "median_earnings",
        "median_home_value",
        "median_smoc",
        "unemployment_rate",
        "commute_habits",
        "commute_time",
    ]
    for table in tables:
        CON.execute(
            f"""COPY (SELECT * FROM {table}) TO '{proc_dir / f"{table}.parquet"}'
             (FORMAT PARQUET) 
             """
        )


if __name__ == "__main__":
    main()
