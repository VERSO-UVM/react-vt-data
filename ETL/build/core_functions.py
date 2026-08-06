"""
**Author**:
    Fitz Koch
**Created**:
    2026-07-07
**Description**:
    Short description
"""

import pandas as pd


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
