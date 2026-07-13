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


def main():
    # test_tables()
    # test_row_counts()
    test_table_structure("acs5_housing")


if __name__ == "__main__":
    main()
