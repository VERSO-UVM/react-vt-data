from fastapi import HTTPException

from api.models import FilterRequest


# helper functions
def ensure_list(x):
    return x if isinstance(x, list) else [x]


class FilterState:
    def __init__(self, df, filter_columns):
        self.df = df
        self.filter_columns = filter_columns
        self.selections = {col: None for col in filter_columns}
        self.raw_selections = {col: None for col in filter_columns}
        self.tree = self.dataframe_to_tree(self.df, self.filter_columns)

    def dataframe_to_tree(self, df, hierarchy_cols) -> dict:
        """Convert a DataFrame into a nested dict keyed by hierarchy_cols."""
        if not hierarchy_cols:
            return None

        col = hierarchy_cols[0]
        tree = {}
        for key, group in df.groupby(col):
            tree[key] = self.dataframe_to_tree(group, hierarchy_cols[1:])
        return tree

    def apply_filters(self, df=None):
        """Apply current filter selections to dataframe"""
        if df is None:
            df = self.df.copy()

        for col, selected_values in self.selections.items():
            if selected_values is None or not selected_values:
                continue
            if col not in df.columns:
                continue
            df = df[df[col].isin(selected_values)]
        return df

    def set_filters(self, filter_dict: dict):
        """
        Update selections from a filter dictionary.
        NOTE: still need to fix to handle 'all'
        """
        for col, values in filter_dict.items():
            if col in self.selections:
                self.selections[col] = values if isinstance(values, list) else [values]


def filter_from_request(df, request: FilterRequest):
    """Apply filters from the request to the df."""
    if request.filters:
        filter_dict = request.filters

        # Validate columns exist
        for col in filter_dict.keys():
            if col not in df.columns:
                raise HTTPException(
                    status_code=400, detail=f"Column '{col}' does not exist"
                )

        Filter = FilterState(df=df, filter_columns=list(filter_dict.keys()))
        Filter.set_filters(filter_dict)
        df = Filter.apply_filters(df)
    return df


def mass_filter_from_requests(dfs: dict, request: FilterRequest):
    """Apply filters to all dataframes in the dict."""
    if not request or not request.filters:
        return dfs

    filtered_dfs = {}
    for k, v in dfs.items():
        try:
            filtered_dfs[k] = filter_from_request(v, request)
        except HTTPException:
            # If column doesn't exist in this df, keep it unfiltered
            filtered_dfs[k] = v

    return filtered_dfs
