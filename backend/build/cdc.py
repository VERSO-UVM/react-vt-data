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
from sklearn.decomposition import PCA

from build import BACKEND, CON, SQL_DIR, bin_measures, data_dir
from sql_render import render_sql

proc_dir = BACKEND / "Data" / "_Processed" / "cdc"
TABLES = [
    "county_places",
    "county_edges",
    "tract_places",
    "tract_edges",
    "countyPcaData",
]


def get_SME_indicatiors() -> str:
    data_notes = pd.read_csv(data_dir / "CDC" / "cdc_notes.csv")
    cdc_notes = data_notes[data_notes["Source"] == "CDC- BRFSS"]
    indicators = cdc_notes["Indicator"].to_list()
    return ", ".join(f"'{i}'" for i in indicators)


def build_PCA_table(us_df: pd.DataFrame) -> pd.DataFrame:
    ## select only shared columns
    vt_df = us_df[us_df["StateAbbr"] == "VT"].copy()
    pv = us_df.pivot(columns="Measure", values="Data_Value", index="LocationID").dropna(
        axis=0, how="any"
    )
    pv_vt = vt_df.pivot(columns="Measure", values="Data_Value", index="LocationID")
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
    df = us_df.copy()
    df["natl_pct"] = df.groupby("Measure")["Data_Value"].rank(pct=True)
    return df[df["StateAbbr"] == "VT"]


def build_places(name: str, path: Path, indicators: str) -> None:
    sql = render_sql(SQL_DIR / "cdc_places.sql", indicators=indicators, path=str(path))
    df = CON.execute(sql).df()
    # Needed to get rid of df variable assignment to pass ruff linting check
    if name == "county":
        build_PCA_table(df)
    pct_df = add_national_percentile(df)  # df here is still national
    df = df[df["StateAbbr"] == "VT"].copy()
    df, edge_df = bin_measures(df, variable_col="Measure", value_col="Data_Value")
    df = df.merge(
        pct_df[["LocationID", "Measure", "natl_pct"]],
        on=["LocationID", "Measure"],
        how="left",
    )
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
    if name == "county":
        CON.execute(f"""--sql
                CREATE OR REPLACE TABLE {name}PcaData
                AS SELECT * 
                FROM pca_df            
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
