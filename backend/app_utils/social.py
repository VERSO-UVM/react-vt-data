import pandas as pd

from app_utils.constants.ACS import ACS_SOCIAL_METRICS
from app_utils.data_loading import load_metrics


def compute_social_metrics(df):
    return load_metrics(df, ACS_SOCIAL_METRICS)


def build_social_plot_dataframes(df, metrics):
    """
    Calculate a dictionary of social dataframes
    """

    return {
        "ex1_dist": pd.DataFrame({"EX1": ["ex"], "Population": [metrics["example"]]}),
        "ex2_dist": pd.DataFrame({"EX2": ["ex"], "Population": [metrics["example"]]}),
        "ex3_dist": pd.DataFrame({"EX3": ["ex"], "Population": [metrics["example"]]}),
    }


def social_df_metric_dict(filtered_gdf_2023):
    metrics = compute_social_metrics(filtered_gdf_2023)
    dfs = build_social_plot_dataframes(filtered_gdf_2023, metrics)
    return metrics, dfs
