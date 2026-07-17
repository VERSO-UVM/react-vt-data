"""
**Author**:
    Ian Sargent
**Created**:
    2026-07-15
**Description**:
    Data cleaning script for the raw `cdc` tables in the DuckLake.
    Cleans both county- and tract-level PLACES data plus the notes table.
    Run with:
python -m ETL.data_cleaning.clean_cdc
"""

import pandas as pd
from datastore.lake_build import con

# Columns we'd like excluded from the cleaned tables, IF they exist on that
# particular RAW table. Tract- and county-level releases don't always share
# an identical schema, so we check before excluding rather than assuming.
CANDIDATE_EXCLUDE_COLS = [
    "geometry",
    "statedesc",
    "data_value_footnote_symbol",
    "data_value_footnote",
    "datasource",
]


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


def get_columns(table: str) -> list[str]:
    """Return the actual column names for a RAW table."""
    return (
        con.execute(
            f"""--sql
            DESCRIBE lake.RAW.{table}
        """).df()["column_name"].tolist())


def bin_measures(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    """
    Bin `data_value` into terciles within each `measure` group.
    Builds the edge table row-by-row (as variable-length lists) instead of
    a wide DataFrame, since pd.qcut can drop duplicate edges and produce a
    different number of bin edges per measure.
    """
    df["data_value"] = pd.to_numeric(df["data_value"], errors="coerce")

    def qcut_group(s: pd.Series):
        return pd.qcut(s, 3, labels=False, duplicates="drop")

    df["bin"] = df.groupby("measure")["data_value"].transform(qcut_group)

    edge_rows = []
    for measure, s in df.groupby("measure")["data_value"]:
        _, edges = pd.qcut(s, 3, retbins=True, duplicates="drop")
        edge_rows.append({"measure": measure, "edges": edges.tolist()})
    edge_df = pd.DataFrame(edge_rows)

    return df, edge_df


def build_places_table(
    raw_table: str, geo_filter_col: str, indicators: str
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """
    Clean a single PLACES RAW table (county or tract) into a
    (places_df, edges_df) pair.
    """
    existing_cols = set(get_columns(raw_table))
    exclude_cols = [c for c in CANDIDATE_EXCLUDE_COLS if c in existing_cols]
    exclude_clause = ", ".join(exclude_cols)

    df = con.execute(
        f"""--sql
        SELECT
            * EXCLUDE ({exclude_clause}),
            CASE
                WHEN datavaluetypeid = 'CrdPrv' AND measure IN ({indicators})
                THEN TRUE
                ELSE FALSE
            END AS sme_highlight
        FROM lake.RAW.{raw_table}
        WHERE {geo_filter_col} = 'VT'
        """).df()

    df, edge_df = bin_measures(df)
    return df, edge_df


def clean() -> dict[str, pd.DataFrame]:
    indicators = get_sme_indicators()

    county_places, county_edges = build_places_table(
        "cdc_places_county", "stateabbr", indicators)
    tract_places, tract_edges = build_places_table(
        "cdc_places_tract", "stateabbr", indicators)

    return {
        "cdc_places_county": county_places,
        "cdc_edges_county": county_edges,
        "cdc_places_tract": tract_places,
        "cdc_edges_tract": tract_edges,
    }


def add_to_lake(tables: dict[str, pd.DataFrame]) -> None:
    for name, df in tables.items():
    
        view_name = f"{name}_df"
    
        con.register(view_name, df)
        con.execute(
            f"""--sql
            CREATE OR REPLACE TABLE lake.CLEANED.{name} AS
            SELECT * FROM {view_name}
            """)
        con.unregister(view_name)


def main():
    tables = clean()
    add_to_lake(tables)


if __name__ == "__main__":
    main()