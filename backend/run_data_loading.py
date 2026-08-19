"""
**Author**:
    Ian Sargent
**Created**:
    2026-08-17
**Description**:
    This is the master orchestrating data loading script.
    Running this document will load each CLEANED table from
    the DuckLake schema into a DuckDB database instance for
    API querying.
**Run with**:
python -m run_data_loading
"""

import duckdb

# DuckLake connection
from datastore.lake_build import con

# New DuckDB connection (where CLEANED lake tables will go)
db_con = duckdb.connect()


def get_cleaned_tables() -> list[str]:
    """
    List all active DuckLake tables within the 'CLEANED' lake schema.
    """
    query = """
        SELECT 
            t.table_name
        FROM __ducklake_metadata_lake.ducklake_table t
        JOIN __ducklake_metadata_lake.ducklake_schema s 
            ON t.schema_id = s.schema_id
        WHERE s.schema_name = 'CLEANED'
            AND t.end_snapshot IS NULL 
            AND s.end_snapshot IS NULL
    """
    tables = [row[0] for row in con.execute(query).fetchall()]

    return tables


def create_duckdb():
    # Fetch CLEANED table names
    tables = get_cleaned_tables()
    total_tables = len(tables)

    # Each table gets written to the DuckDB as its own table
    try:
        for i, table in enumerate(tables):
            df = con.sql(f"SELECT * FROM lake.CLEANED.{table}").df()  # noqa: F841
            db_con.execute(f"CREATE OR REPLACE TABLE {table} AS SELECT * FROM df")

            print(
                f"\r{i + 1} / {total_tables} tables added to the database",
                end="",
                flush=True,
            )

    except Exception as e:
        print(f"Database creation failed: {e}")

    print("\nDATABASE COMPLETED")


def main():
    create_duckdb()


if __name__ == "__main__":
    main()
