"""
**Author**:
    Fitz Koch
**Created**:
    2026-06-09
**Description**:
    Functions for serving acs5 data to the API from parquet files.
    TODO: Incomplete. Add more.
"""

from app_utils.db import DB  ## note this is the static prebuilt db
from query.core_functions import filter_tree

DP_COMB_COLS = {
    "table": "table",
    "category": "category",
    "Subcategory": "Subcategory",
    "Variable": "Variable",
    "Measure": "Measure",
}

DP_COMB_TREE_LABELS = list(DP_COMB_COLS.keys())


def get_acs5_dp_combined_filters():
    return filter_tree(DP_COMB_COLS, DP_COMB_TREE_LABELS, "dp_combined", db=DB)
