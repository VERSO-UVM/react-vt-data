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

import duckdb
import pandas as pd
from sklearn.decomposition import PCA

# Columns to exclude from the cleaned tables
EXCLUDE_COLS = [
    "statedesc",
    "data_value_footnote_symbol",
    "data_value_footnote",
    "datasource",
]


def bin_measures(
    df: pd.DataFrame, variable_col, value_col
) -> tuple[pd.DataFrame, pd.DataFrame]:
    edges_by_variable = {}

    def bin_group(s: pd.Series):
        codes, edges = pd.qcut(s, 3, labels=False, retbins=True)
        edges_by_variable[s.name] = edges
        return codes

    df["bin"] = df.groupby(variable_col)[value_col].transform(bin_group)
    edge_df = (
        pd.DataFrame(edges_by_variable)
        .transpose()
        .reset_index()
        .rename(columns={"index": f"{variable_col}"})
    )
    return df, edge_df


def get_sme_indicators(con: duckdb.DuckDBPyConnection) -> str:
    """
    Get CDC Notes indicators (manually created key indicators list)

    Args:
        con: DuckDBPyConnection to the DuckLake

    Returns:
        str: A comma separated string list of key indicators for SQL queries
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
    Builds a 2-Principal Component PCA score for Vermont counties.

    PCA is fit using the full national county dataset. Vermont county
    observations are then standardized using the national means and
    standard deviations before being projected into the fitted PCA space.

    Args:
        us_df: A pandas.DataFrame object containing CDC PLACES data for all states in the U.S.
    Returns:
        pd.DataFrame: A pandas DataFrame object containing "LocationID" and the first PCA component score.
    """
    # Build a wide national dataset:
    #   rows    = counties
    #   columns = CDC measures
    pv = us_df.pivot_table(
        index="locationid",
        columns="measure",
        values="data_value",
        aggfunc="first",
    ).dropna(axis=0, how="any")

    # Build Vermont-wide dataset using the same measures
    vt_df = us_df[us_df["stateabbr"].eq("VT")].copy()

    pv_vt = vt_df.pivot_table(
        index="locationid",
        columns="measure",
        values="data_value",
        aggfunc="first",
    )

    # Keep only measures that exist in both datasets and have
    # complete national data.
    shared = pv.columns.intersection(pv_vt.columns)

    pv = pv[shared].dropna(axis=1, how="all")
    pv_vt = pv_vt[pv.columns]

    # Only retain Vermont counties with complete data for all
    # measures used in the PCA.
    pv_vt = pv_vt.dropna(axis=0, how="any")

    # Standardize using NATIONAL parameters.
    mean = pv.mean()
    std = pv.std()

    # Avoid division by zero for constant measures.
    valid = std > 0
    pv = pv.loc[:, valid]
    pv_vt = pv_vt.loc[:, valid]
    mean = mean[valid]
    std = std[valid]

    pv_standardized = (pv - mean) / std
    vt_standardized = (pv_vt - mean) / std

    # Fit PCA using national observations.
    pca = PCA(n_components=2)
    pca.fit(pv_standardized)

    # Project Vermont observations into national PCA space.
    scores = pca.transform(vt_standardized)

    return pd.DataFrame(
        {
            "LocationID": pv_vt.index,
            "pca_score": scores[:, 0],
        }
    )


def add_national_percentile(us_df: pd.DataFrame) -> pd.DataFrame:
    """
    Adds a ranked national percentage column to the VT-only table

    Args:
        us_df: A pandas.DataFrame object containing CDC PLACES data for all states in the U.S.

    Returns:
        pd.DataFrame: A pandas DataFrame object containing the "natl_pct" column for comparisons.
    """
    df = us_df.copy()
    df["natl_pct"] = df.groupby("measure")["data_value"].rank(pct=True)
    return df[df["stateabbr"] == "VT"]


def get_columns(raw_table_name: str, con: duckdb.DuckDBPyConnection) -> list[str]:
    """
    Returns the actual column names for a RAW table.

    Args:
        table: The name of the `lake.RAW ` table from which to return the column names of
        con: DuckDBPyConnection to the DuckLake

    Returns:
        list[str]: A list of string column names from the lake.RAW table
    """
    return (
        con.execute(
            f"""--sql
            DESCRIBE lake.RAW.{raw_table_name}
            """
        )
        .df()["column_name"]
        .tolist()
    )


def build_places_table(
    raw_table_name: str,
    geo_filter_col: str,
    indicators: str,
    con: duckdb.DuckDBPyConnection,
) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """
    Cleans a single PLACES RAW table (county or tract).
    Args:
        raw_table_name: The name of the Lake.RAW table to clean
        geo_filter_col: The name of the geographic name column to filter to
        indicators: String comma separated list of key indicators
            - See :func:`get_sme_indicators`
        con: DuckDBPyConnection to the DuckLake
    Returns:
        us_df: Full national dataset with national percentiles.
        vt_df: Vermont-only cleaned dataset with measure bins.
        edge_df: Measure binned category edges.
    """
    existing_cols = set(get_columns(raw_table_name, con))
    exclude_cols = [c for c in EXCLUDE_COLS if c in existing_cols]
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
        FROM lake.RAW.{raw_table_name}
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


def clean(con: duckdb.DuckDBPyConnection) -> dict[str, pd.DataFrame]:
    indicators = get_sme_indicators(con)

    # County: keep the full national dataset for percentile/PCA calculations
    county_us, county_places, county_edges = build_places_table(
        "cdc_places_county", "stateabbr", indicators, con
    )

    county_places.rename(
        columns={
            "totalpop18plus": "total_pop_18plus",
            "locationid": "geoid",
            "categoryid": "category_id",
            "stateabbr": "state_abbr",
            "locationname": "county",
            "datavaluetypeid": "data_value_type_id",
            "measureid": "measure_id",
            "totalpopulation": "total_population",
        },
        inplace=True,
    )

    county_places.drop(columns=["state_abbr"], inplace=True)
    county_places["geo_type"] = "county"
    # County-level geoid IS the county FIPS; add county_fips so the column
    # is present on both geo levels and the tables can be stacked.
    county_places["county_fips"] = county_places["geoid"]

    # PCA is fit on the national county data and applied to Vermont
    pca_county = build_PCA_table(county_us)

    # Tract: national data is needed for the national percentile
    _, tract_places, tract_edges = build_places_table(
        "cdc_places_tract", "stateabbr", indicators, con
    )

    tract_places.rename(
        columns={
            "totalpop18plus": "total_pop_18plus",
            "locationid": "geoid",
            "categoryid": "category_id",
            "stateabbr": "state_abbr",
            "countyname": "county",
            "countyfips": "county_fips",
            "datavaluetypeid": "data_value_type_id",
            "measureid": "measure_id",
            "totalpopulation": "total_population",
        },
        inplace=True,
    )

    tract_places.drop(columns=["locationname", "state_abbr"], inplace=True)
    tract_places["geo_type"] = "town"

    # Both tables now share an identical column set (county_fips added to
    # county_places above), so they stack cleanly into one tidy table.
    combined_places = pd.concat([county_places, tract_places], ignore_index=True)

    return {
        "cdc_places_county": county_places,
        "cdc_edges_county": county_edges,
        "cdc_places_tract": tract_places,
        "cdc_edges_tract": tract_edges,
        "cdc_pca_county": pca_county,
        "cdc_places_combined_tidy": combined_places,
    }


def add_to_lake(
    tables: dict[str, pd.DataFrame], con: duckdb.DuckDBPyConnection
) -> None:
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


def main(con: duckdb.DuckDBPyConnection):
    tables = clean(con)
    add_to_lake(tables, con)


if __name__ == "__main__":
    main()
