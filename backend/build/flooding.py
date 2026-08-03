from build import BACKEND, CON, data_dir

PARQUET = data_dir / "Flooding" / "vt-flood-hazard.parquet"
proc_dir = BACKEND / "Data" / "_Processed" / "flood"
SQL_DIR = BACKEND / "build" / "sql"


def main():

    # Load raw table from parquet
    CON.execute(f"""
        CREATE OR REPLACE VIEW raw AS
        SELECT *
        FROM read_parquet('{PARQUET}')
    """)

    # Run SQL files in order
    for name in ["flood_info.sql", "flood_geom.sql", "flood_build.sql"]:
        CON.execute((SQL_DIR / name).read_text())

    for table in ["flood_hazard"]:
        CON.execute(
            f"COPY (SELECT * FROM {table}) TO '{proc_dir / 'Flooding' / f'{table}.parquet'}' "
        )

    print("Flood hazard tables built.")


if __name__ == "__main__":
    main()
