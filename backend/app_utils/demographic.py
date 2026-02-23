import pandas as pd

from app_utils.constants.ACS import (
    ACS_DEMOGRAPHIC_METRICS,
    AGE_GROUP_COLUMNS,
    AGE_GROUP_LABELS,
    RACE_COLUMNS,
    RACE_LABELS,
)
from app_utils.data_loading import load_metrics


def compute_demog_metrics(df):
    return load_metrics(df, ACS_DEMOGRAPHIC_METRICS)


def build_demog_plot_dataframes(df, metrics):
    """
    Calculate a dictionary of demographic dataframes
    """

    return {
        "age_dist": pd.DataFrame(
            {
                "Age Group": AGE_GROUP_LABELS,
                "Population": [df[col].sum() for col in AGE_GROUP_COLUMNS],
            }
        ),
        "race_dist": pd.DataFrame(
            {
                "Race/Ethnicity": RACE_LABELS,
                "Population": [df[col].sum() for col in RACE_COLUMNS],
            }
        ),
        "sex_dist": pd.DataFrame(
            {
                "Sex": ["Male", "Female"],
                "Population": [metrics["pop_male"], metrics["pop_female"]],
            }
        ),
    }


def demog_df_metric_dict(filtered_gdf_2023):
    metrics = compute_demog_metrics(filtered_gdf_2023)
    dfs = build_demog_plot_dataframes(filtered_gdf_2023, metrics)
    return metrics, dfs
