"""
Open Research Community Accelorator
Vermont Data App

Housing Utility Functions
"""

import pandas as pd

from app_utils.constants.ACS import (
    ACS_HOUSING_METRICS,
    HOUSING_YEAR_LABELS,
    NEW_HOUSING_UNIT_COLUMNS,
    POPULATION_YEAR_LABELS,
)
from app_utils.data_loading import load_metrics


def compute_housing_metrics(df):
    return load_metrics(df, ACS_HOUSING_METRICS)


def housing_df_metric_dict(filtered_housing_dfs):
    # Unpack necessary datasets
    filtered_gdf_2023 = filtered_housing_dfs["housing_2023"]
    metrics = compute_housing_metrics(filtered_gdf_2023)
    dfs = build_housing_plot_dataframes(filtered_housing_dfs, metrics)

    return metrics, dfs


def build_housing_plot_dataframes(dfs, metrics):
    """
    Calculate a dictionary of housing dataframes
    """

    filtered_gdf_2023 = dfs["housing_2023"]

    filtered_pop_df = dfs["vt_historic_population"]

    population_counts = [
        filtered_pop_df.loc[filtered_pop_df["Year"] == year, "Population"].sum()
        for year in POPULATION_YEAR_LABELS
    ]
    raw_housing_counts = [
        filtered_gdf_2023[col].sum() for col in NEW_HOUSING_UNIT_COLUMNS
    ]
    # get hardcoded metrics
    pct_occ_2023 = metrics["pct_occupied"]
    pct_vac_2023 = metrics["pct_vacant"]
    pct_own_2023 = metrics["pct_owned"]
    pct_rent_2023 = metrics["pct_rented"]

    # Units in structure: define the label and corresponding metric keys
    structure_labels = [
        "1-Unit",
        "2-Units",
        "3 - 4 Units",
        "5 - 9 Units",
        "10 - 19 Units",
        "20+ Units",
        "Mobile Homes",
        "Boat/RV/Van, etc.",
    ]
    structure_keys = [
        "one_unit_total",
        "two_units",
        "three_or_four_units",
        "five_to_nine_units",
        "ten_to_nineteen_units",
        "twenty_or_more_units",
        "mobile_home",
        "boat_rv_van_etc",
    ]

    return {
        "occupancy_occ_df": pd.DataFrame(
            {
                "Occupancy Status": ["Occupied", "Vacant"],
                "Value": [pct_occ_2023, pct_vac_2023],
            }
        ),
        "occupancy_vac_df": pd.DataFrame(
            {
                "Occupancy Status": ["Occupied", "Vacant"],
                "Value": [pct_occ_2023, pct_vac_2023],
            }
        ),
        "tenure_df": pd.DataFrame(
            {
                "Occupied Tenure": ["Owner", "Renter"],
                "Value": [pct_own_2023, pct_rent_2023],
            }
        ),
        "units_in_structure_df": pd.DataFrame(
            {
                "Structure Category": structure_labels,
                "Units": [metrics[k] for k in structure_keys],
            }
        ),
        "housing_population_df": pd.DataFrame(
            {
                "Year Range": HOUSING_YEAR_LABELS,
                "Census Year": POPULATION_YEAR_LABELS,
                "Population": population_counts,
                "Total Housing Units": pd.Series(raw_housing_counts).cumsum().tolist(),
                "New Housing Units": raw_housing_counts,
            }
        ).melt(
            id_vars=["Year Range", "Census Year"],
            value_vars=["Population", "Total Housing Units", "New Housing Units"],
            var_name="Metric",
            value_name="Value",
        ),
    }
