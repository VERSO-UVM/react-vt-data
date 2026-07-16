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


def test_tables():
    tables = con.execute("""
        SHOW TABLES FROM lake.RAW
    """).fetchall()

    assert len(tables) > 0


def test_row_counts():
    tables = [
        row[0]
        for row in con.execute("""
            SHOW TABLES FROM lake.RAW
        """).fetchall()
    ]

    for table in tables:
        count = con.execute(
            f"""
            SELECT COUNT(*)
            FROM lake.RAW.{table}
            """
        ).fetchone()[0]

        print(f"{table}: {count:,} rows")

        assert count > 0


def test_table_structure(table_name: str):
    print("______________________________________")
    print(f"Showing the {table_name} table below ... ")
    print(
        con.execute(
            f"""
            SELECT * 
            FROM lake.RAW.{table_name}
            LIMIT 5;
            """
        ).fetchall()
    )


def test_cleaned_zoning():
    """Validate lake.CLEANED zoning tables after ETL load."""

    con.execute(
        """
        INSTALL spatial;
        LOAD spatial;
        """
    )
    tables = [
        "info",
        "geom",
        "rules",
        "wide",
        "colors",
    ]

    print("\n=== CLEANED ZONING TABLE TEST ===\n")

    for table in tables:
        full_name = f"lake.CLEANED.zoning_{table}"

        print("=" * 80)
        print(f"TABLE: {full_name}")

        # row count
        rows = con.execute(
            f"SELECT COUNT(*) FROM {full_name}"
        ).fetchone()[0]

        print(f"Rows: {rows:,}")


        # sample
        print("\nSample:")
        sample = con.execute(
            f"SELECT * FROM {full_name} LIMIT 2"
        ).df()

        print(sample)

        # geometry checks
        if table == "geom":
            print("\nGeometry checks:")

            geom_type = con.execute(
                """
                SELECT typeof(geometry)
                FROM lake.CLEANED.zoning_geom
                LIMIT 1
                """
            ).fetchone()

            print("Geometry type:", geom_type[0])

        print()


def test_raw_wastewater_tables():
    """Print schema and sample data for the raw wastewater tables."""

    tables = [
        "ww_treatment_facilities",
        "ww_service_areas",
        "septic_soil_suitability",
    ]

    for table in tables:
        print(f"\n{'=' * 80}")
        print(f"RAW.{table}")
        print("=" * 80)

        # Row count
        nrows = con.execute(f"""
            SELECT COUNT(*)
            FROM lake.RAW.{table}
        """).fetchone()[0]
        print(f"Rows: {nrows:,}")

        # Schema
        print("\nSchema:")
        print(
            con.execute(f"""
                DESCRIBE lake.RAW.{table}
            """).df()
        )

        # Geometry info
        cols = con.execute(f"""
            DESCRIBE lake.RAW.{table}
        """).df()["column_name"].tolist()

        if "geometry" in cols:
            print("\nGeometry sample:")
            print(
                con.execute(f"""
                    SELECT
                        typeof(geometry) AS storage_type,
                        OCTET_LENGTH(geometry) AS bytes
                    FROM lake.RAW.{table}
                    LIMIT 5
                """).df()
            )

        # Preview
        print("\nFirst 5 rows:")
        print(
            con.execute(f"""
                SELECT *
                FROM lake.RAW.{table}
                LIMIT 5
            """).df()
        ) 
    return


def main():
    # test_tables()
    # test_row_counts()
    # test_table_structure("demographics")
    # test_cleaned_zoning()
    test_raw_wastewater_tables()


if __name__ == "__main__":
    main()
