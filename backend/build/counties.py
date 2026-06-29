"""
**Author**:
    Fitz Koch
**Created**:
    2026-06-23
**Description**:
    Build processed and clean county line geojson to join on.
"""

from build import BACKEND, CON, data_dir

proc_dir = BACKEND / "Data" / "_Processed" / "vermont"
sql_path = BACKEND / "build" / "sql"


def main():
    path = data_dir / "vermont" / "countyLines.geojson"
    CON.execute(f"""--sql
        CREATE OR REPLACE VIEW counties AS
        SELECT
            CNTYGEOID AS CountyFIPS,
            CNTYNAME AS CountyName,
            geom
        FROM ST_Read('{path}')
    """)
    proc_dir.mkdir(parents=True, exist_ok=True)
    for table in ["counties"]:
        CON.execute(
            f"COPY (SELECT * FROM {table}) TO '{proc_dir / f'{table}.parquet'}' "
        )


if __name__ == "__main__":
    main()
