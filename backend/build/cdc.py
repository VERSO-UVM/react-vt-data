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
TABLES = ["places", "edges"]


def get_SME_indicatiors() -> str:
    data_notes = pd.read_csv(data_dir / "CDC" / "cdc_notes.csv")
    cdc_notes = data_notes[data_notes["Source"] == "CDC- BRFSS"]
    indicators = cdc_notes["Indicator"].to_list()
    return ", ".join(f"'{i}'" for i in indicators)


def bin_measures(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    edges_by_measure = {}

    def bin_group(s: pd.Series):
        codes, edges = pd.qcut(s, 5, labels=False, retbins=True)
        edges_by_measure[s.name] = edges
        return codes

    df["bin"] = df.groupby("Measure")["Data_Value"].transform(bin_group)
    edge_df = (
        pd.DataFrame(edges_by_measure)
        .transpose()
        .reset_index()
        .rename(columns={"index": "Measure"})
    )
    return df, edge_df


def build_tables(indicators: str) -> None:
    path = data_dir / "CDC" / "CDC_Places.csv"
    df = CON.execute(f"""--sql
        SELECT
            * EXCLUDE (
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
        WHERE StateAbbr IN ('VT')
  """).df()
    df, edge_df = bin_measures(df)
    CON.execute("""--sql
            CREATE OR REPLACE TABLE places
            AS SELECT * 
            FROM df            
        """)
    CON.execute("""--sql
        CREATE OR REPLACE TABLE edges
        AS SELECT * 
        FROM edge_df            
    """)


def main():
    indicators = get_SME_indicatiors()
    build_tables(indicators)
    proc_dir.mkdir(parents=True, exist_ok=True)
    for table in TABLES:
        CON.execute(
            f"COPY (SELECT * FROM {table}) TO '{proc_dir / f'{table}.parquet'}' "
        )


if __name__ == "__main__":
    main()
