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

import os
from pathlib import Path

import duckdb

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = Path(os.getenv("DATA_DIR", ROOT / "Data"))


def get_cleaned_tables(db_con: duckdb.DuckDBPyConnection) -> list[str]:
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
        ORDER BY table_name
    """
    tables = [row[0] for row in db_con.execute(query).fetchall()]

    return tables


def create_duckdb():
    warehouse_path = DATA_DIR / "warehouse.duckdb"
    lake_db_path = DATA_DIR / "lake"
    storage_path = DATA_DIR / "lake.files"

    db_con = duckdb.connect(str(warehouse_path))

    db_con.execute(
        f"""
        ATTACH '{lake_db_path.as_posix()}'
        AS lake (
            TYPE ducklake,
            DATA_PATH '{storage_path.as_posix()}',
            OVERRIDE_DATA_PATH TRUE
        )
        """
    )

    tables = get_cleaned_tables(db_con)
    total_tables = len(tables)

    failed = []

    for i, table in enumerate(tables):
        try:
            db_con.execute(
                f'''
                CREATE OR REPLACE TABLE "{table}"
                AS
                SELECT *
                FROM lake.CLEANED."{table}"
                '''
            )
        except Exception as e:
            failed.append((table, str(e)))

        print(
            f"\r{i + 1}/{total_tables} processed",
            end="",
            flush=True,
        )

    if failed:
        print(f"\n{len(failed)} tables failed:")
        for table, error in failed:
            print(f"  {table}: {error}")

    db_con.execute("DETACH lake")
    db_con.close()

    print("\nDATABASE COMPLETED!")


def main():
    create_duckdb()


if __name__ == "__main__":
    main()
