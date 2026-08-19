"""
**Author**:
    Ian Sargent
**Created**:
    2026-07-15
**Description**:
    Data cleaning script for the raw `cdc` tables in the DuckLake.
    Cleans both county- and tract-level PLACES data plus the notes table.
**Run with**:
python -m data_cleaning.clean_cdc
"""

import pandas as pd
from sklearn.decomposition import PCA

from build.core_functions import bin_measures
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
    """
    Get CDC Notes indicators
    """
    data_notes = con.execute(
        """--sql
        SELECT *
        FROM lake.RAW.cdc_notes
        """
    ).df()
    cdc_notes = data_notes[data_notes["Source"] == "CDC- BRFSS"]
    indicators = cdc_notes["Indicator"].to_list()
    return ", ".join(f"'{i}'" for i in indicators)


def build_PCA_table(us_df: pd.DataFrame) -> pd.DataFrame:
    """
    Builds a 2-Principal Component DataFrame
    for county-level CDC indicators
    """
    ## select only shared columns
    vt_df = us_df[us_df["stateabbr"] == "VT"].copy()
    pv = us_df.pivot(columns="measure", values="data_value", index="locationid").dropna(
        axis=0, how="any"
    )
    pv_vt = vt_df.pivot(columns="measure", values="data_value", index="locationid")
    shared = pv.columns.intersection(pv_vt.dropna(axis=1, how="all").columns)
    pv = pv[shared]
    pv_vt = pv_vt[shared]

    ## standardize US to build column
    mean, std = pv.mean(), pv.std()
    pv = (pv - mean) / std
    pca = PCA(n_components=2)
    pca.fit(pv)

    # standardize the  VT, transform, add back in, and return
    pv_vt = (pv_vt - mean) / std
    assert list(pv_vt.columns) == list(pv.columns), "measure columns misaligned"
    scores = pca.transform(pv_vt)
    pv_vt["pca_score"] = scores[:, 0]
    pv_vt = pv_vt.reset_index()
    return pv_vt


def add_national_percentile(us_df: pd.DataFrame) -> pd.DataFrame:
    """
    Adds a ranked national percentage column to the VT-only table
    """
    df = us_df.copy()
    df["natl_pct"] = df.groupby("measure")["data_value"].rank(pct=True)
    return df[df["stateabbr"] == "VT"]


def get_columns(table: str) -> list[str]:
    """
    Returns the actual column names for a RAW table.
    """
    return (
        con.execute(
            f"""--sql
            DESCRIBE lake.RAW.{table}
            """
        )
        .df()["column_name"]
        .tolist()
    )


def build_places_table(
    raw_table: str, geo_filter_col: str, indicators: str
) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """
    Cleans a single PLACES RAW table (county or tract).

    Returns:
        us_df: Full national dataset with national percentiles.
        vt_df: Vermont-only cleaned dataset with measure bins.
        edge_df: Measure bin edges.
    """
    existing_cols = set(get_columns(raw_table))
    exclude_cols = [c for c in CANDIDATE_EXCLUDE_COLS if c in existing_cols]
    exclude_clause = ", ".join(exclude_cols)

    us_df = con.execute(
        f"""--sql
        SELECT
            * EXCLUDE ({exclude_clause}),
            CASE
                WHEN datavaluetypeid = 'CrdPrv'
                    AND measure IN ({indicators})
                THEN TRUE
                ELSE FALSE
            END AS sme_highlight
        FROM lake.RAW.{raw_table}
        """
    ).df()

    us_df["data_value"] = pd.to_numeric(
        us_df["data_value"],
        errors="coerce",
    )

    # Calculate percentile against the full national dataset
    us_df = add_national_percentile(us_df)

    # Keep only Vermont for the cleaned places table
    vt_df = us_df[us_df[geo_filter_col].eq("VT")].copy()

    # Bin Vermont measures
    vt_df, edge_df = bin_measures(vt_df, variable_col="measure", value_col="data_value")

    return us_df, vt_df, edge_df


def clean() -> dict[str, pd.DataFrame]:
    indicators = get_sme_indicators()

    # County: keep the full national dataset for percentile/PCA calculations
    county_us, county_places, county_edges = build_places_table(
        "cdc_places_county",
        "stateabbr",
        indicators,
    )

    # PCA is fit on the national county data and applied to Vermont
    # pca_county = build_PCA_table(county_us)

    # Tract: national data is needed for the national percentile
    _, tract_places, tract_edges = build_places_table(
        "cdc_places_tract",
        "stateabbr",
        indicators,
    )

    return {
        "cdc_places_county": county_places,
        "cdc_edges_county": county_edges,
        "cdc_places_tract": tract_places,
        "cdc_edges_tract": tract_edges,
        # "cdc_pca_county": pca_county,
    }


def add_to_lake(tables: dict[str, pd.DataFrame]) -> None:
    for name, df in tables.items():
        view_name = f"{name}_df"

        con.register(view_name, df)
        con.execute(
            f"""--sql
            CREATE OR REPLACE TABLE lake.CLEANED.{name} AS
            SELECT * FROM {view_name}
            """
        )
        con.unregister(view_name)


def main():
    tables = clean()
    add_to_lake(tables)


if __name__ == "__main__":
    main()
