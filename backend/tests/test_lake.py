"""
Diagnostic script for inspecting DuckLake table structure.

Usage (from backend):
python -m tests.test_lake
"""

from datastore.lake_build import con


def inspect_schema(schema: str) -> None:
    print("\n" + "=" * 80)
    print(f"SCHEMA: {schema}")
    print("=" * 80)

    # ------------------------------------------------------------------
    # List tables
    # ------------------------------------------------------------------
    tables = con.execute(
        """
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = ?
        ORDER BY table_name
        """,
        [schema],
    ).fetchall()

    if not tables:
        print("No tables found.")
        return

    print(f"\nFound {len(tables)} table(s):")

    for (table_name,) in tables:
        print(f"\n{'-' * 80}")
        print(f"TABLE: {schema}.{table_name}")
        print("-" * 80)

        # --------------------------------------------------------------
        # Column structure
        # --------------------------------------------------------------
        columns = con.execute(
            """
            SELECT
                column_name,
                data_type,
                is_nullable
            FROM information_schema.columns
            WHERE table_schema = ?
              AND table_name = ?
            ORDER BY ordinal_position
            """,
            [schema, table_name],
        ).fetchall()

        # --------------------------------------------------------------
        # Year information
        # --------------------------------------------------------------
        column_names = [column[0].lower() for column in columns]

        if "year" in column_names:
            try:
                years = con.execute(
                    f'''
                    SELECT
                        MIN(year),
                        MAX(year),
                        COUNT(DISTINCT year)
                    FROM "lake"."{schema}"."{table_name}"
                    '''
                ).fetchone()

                print(f"Years: {years[0]} → {years[1]} ({years[2]} distinct)")

            except Exception as e:
                print(f"Could not inspect years: {e}")


def main() -> None:
    print("=" * 80)
    print("DUCKLAKE INSPECTION")
    print("=" * 80)

    # Show the databases/catalogs available to this connection.
    print("\nDatabases:")
    try:
        print(con.execute("SHOW DATABASES").fetchdf().to_string(index=False))
    except Exception as e:
        print(f"Could not list databases: {e}")

    # Inspect both of your schemas.
    for schema in ("RAW", "CLEANED"):
        inspect_schema(schema)

    print("\n" + "=" * 80)
    print("DONE")
    print("=" * 80)


if __name__ == "__main__":
    main()
