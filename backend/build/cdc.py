"""
**Author**:
    Fitz Koch
**Created**:
    2026-06-22
**Description**:
    Build script to convert the CDC-places csv data into a single vermont-based SQL table.
"""

import pandas as pd

from build import BACKEND, CON, data_dir

proc_dir = BACKEND / "Data" / "_Processed" / "cdc"


def get_SME_indicatiors() -> str:
    data_notes = pd.read_csv(data_dir / "CDC" / "cdc_notes.csv")
    cdc_notes = data_notes[data_notes["Source"] == "CDC- BRFSS"]
    indicators = cdc_notes["Indicator"].to_list()
    return ", ".join(f"'{i}'" for i in indicators)


def build_tables(indicators: str) -> None:
    path = data_dir / "CDC" / "CDC_Places.csv"
    CON.execute(f"""--sql
        CREATE OR REPLACE VIEW places AS
        SELECT
            * EXCLUDE (uv
                Geolocation,
                StateDesc,
                Data_Value_Footnote_Symbol,
                Data_Value_Footnote,
                DataSource
            ),
            CASE
                WHEN DataValueTypeID = 'CrdPrv' AND Measure IN ({indicators})
                THEN TRUE
                ELSE FALSE
            END AS SME_Highlight
        FROM read_csv ('{path}')
  """)


def main():
    indicators = get_SME_indicatiors()
    build_tables(indicators)
    proc_dir.mkdir(parents=True, exist_ok=True)
    for table in ["places"]:
        CON.execute(
            f"COPY (SELECT * FROM {table}) TO '{proc_dir / f'{table}.parquet'}' "
        )


if __name__ == "__main__":
    main()
