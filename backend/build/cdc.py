"""
**Author**:
    Fitz Koch
**Created**:
    2026-06-22
**Description**:
    Build script to convert the CDC-places csv data into a single vermont-based SQL table.
"""

from pathlib import Path

import pandas as pd

from build import BACKEND, CON, SQL_DIR, bin_measures, data_dir
from sql_render import render_sql

proc_dir = BACKEND / "Data" / "_Processed" / "cdc"
TABLES = ["county_places", "county_edges", "tract_places", "tract_edges"]


def get_SME_indicatiors() -> str:
    data_notes = pd.read_csv(data_dir / "CDC" / "cdc_notes.csv")
    cdc_notes = data_notes[data_notes["Source"] == "CDC- BRFSS"]
    indicators = cdc_notes["Indicator"].to_list()
    return ", ".join(f"'{i}'" for i in indicators)


def build_places(name: str, path: Path, indicators: str) -> None:
    sql = render_sql(SQL_DIR / "cdc_places.sql", indicators=indicators, path=str(path))
    df = CON.execute(sql).df()
    df, edge_df = bin_measures(df, variable_col="Measure", value_col="Data_Value")
    CON.execute(f"""--sql
            CREATE OR REPLACE TABLE {name}_places
            AS SELECT * 
            FROM df            
        """)
    CON.execute(f"""--sql
        CREATE OR REPLACE TABLE {name}_edges
        AS SELECT * 
        FROM edge_df            
    """)


def main():
    indicators = get_SME_indicatiors()
    path_dict = {
        "county": data_dir / "CDC" / "CDC_Places.csv",
        "tract": data_dir
        / "CDC"
        / "PLACES__Local_Data_for_Better_Health,_Census_Tract_Data,_2025_release_20260707.csv",
    }
    for name, path in path_dict.items():
        build_places(name, path, indicators)
    proc_dir.mkdir(parents=True, exist_ok=True)
    for table in TABLES:
        CON.execute(
            f"COPY (SELECT * FROM {table}) TO '{proc_dir / f'{table}.parquet'}' "
        )


if __name__ == "__main__":
    main()
