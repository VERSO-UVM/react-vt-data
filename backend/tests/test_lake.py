from datastore.lake import con


def test_tables():
    tables = con.execute("""
        SHOW TABLES FROM lake.main
    """).fetchall()

    assert len(tables) > 0


def test_row_counts():
    tables = [
        row[0]
        for row in con.execute("""
            SHOW TABLES FROM lake.main
        """).fetchall()
    ]

    for table in tables:
        count = con.execute(
            f"""
            SELECT COUNT(*)
            FROM lake.main.{table}
            """
        ).fetchone()[0]

        print(f"{table}: {count:,} rows")

        assert count > 0


def main():
    test_tables()
    test_row_counts()


if __name__ == "__main__":
    main()
