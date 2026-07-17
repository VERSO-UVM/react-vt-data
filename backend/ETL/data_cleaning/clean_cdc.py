"""
**Author**:
    Ian Sargent
**Created**:
    2026-07-15
**Description**:
    Data cleaning script for the raw `cdc` tables in the DuckLake
    Run with:
python -m ETL.data_cleaning.clean_cdc
"""

import pandas as pd
from datastore.lake_build import con


def get_sme_indicators() -> str:
    data_notes = con.execute(
        """--sql
        SELECT * 
        FROM lake.RAW.cdc_notes
        """
    ).df()
    cdc_notes = data_notes[data_notes["Source"] == "CDC- BRFSS"]
    indicators = cdc_notes["Indicator"].to_list()
    return ", ".join(f"'{i}'" for i in indicators)


def bin_measures(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    edges_by_measure = {}

    def bin_group(s: pd.Series):
        codes, edges = pd.qcut(s, 3, labels=False, retbins=True, duplicates="drop")
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


def build_tables(indicators: str) -> tuple[pd.DataFrame, pd.DataFrame]:
    df = con.execute(
        f"""--sql
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
        FROM lake.RAW.cdc_places
        WHERE StateAbbr = 'VT'
        """).df()
    
    df, edge_df = bin_measures(df)
    
    return df, edge_df


def clean() -> tuple[pd.DataFrame, pd.DataFrame]:
    indicators = get_sme_indicators()
    places, edges = build_tables(indicators)
    
    return places, edges


def add_to_lake(places: pd.DataFrame, edges: pd.DataFrame) -> None:
    con.register("places_df", places)
    con.register("edges_df", edges)

    con.execute(
        """--sql
        CREATE OR REPLACE TABLE lake.CLEANED.cdc_places AS
        SELECT * FROM places_df
        """)

    con.execute(
        """--sql
        CREATE OR REPLACE TABLE lake.CLEANED.cdc_edges AS
        SELECT * FROM edges_df
        """)





def main():
    places, edges = clean()
    add_to_lake(places, edges)

if __name__ == "__main__":
    main()
