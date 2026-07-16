"""
**Author**:
    Ian Sargent
**Created**:
    2026-07-10
**Description**:
    Testing script for DuckLake tables (RAW + ClEANED)
    Run with: 
python -m tests.test_lake
"""

from datastore.lake_build import con


def test_cleaned_tables(prefix: str = "wastewater") -> None:
    """
    Print summary information for all cleaned tables associated with a dataset.

    Reports:
        - row count
        - column names
        - data types
        - duplicate columns
        - null counts
    """

    tables = con.execute(f"""
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'CLEANED'
          AND table_name LIKE '{prefix}%'
        ORDER BY table_name
    """).fetchdf()["table_name"]

    for table in tables:
        print("=" * 80)
        print(f"CLEANED.{table}")
        print("=" * 80)

        # Row count
        rows = con.execute(f"""
            SELECT COUNT(*)
            FROM lake.CLEANED.{table}
        """).fetchone()[0]

        print(f"Rows: {rows:,}\n")

        # Schema
        schema = con.execute(f"""
            DESCRIBE lake.CLEANED.{table}
        """).fetchdf()

        print("Schema:")
        print(schema[["column_name", "column_type", "null"]])
        print()

        # Null counts
        cols = schema["column_name"].tolist()

        null_sql = ",\n".join(
            [
                f"SUM(CASE WHEN {c} IS NULL THEN 1 ELSE 0 END) AS {c}"
                for c in cols
            ]
        )

        nulls = con.execute(f"""
            SELECT
            {null_sql}
            FROM lake.CLEANED.{table}
        """).fetchdf().T

        nulls.columns = ["Null Count"]

        print("Null Counts:")
        print(nulls)
        print()

        print()


def main():
    test_cleaned_tables()


if __name__ == "__main__":
    main()
