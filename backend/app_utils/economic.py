"""
Open Research Community Accelorator
Vermont Data App

Economic Utility Functions
"""

import altair as alt
import pandas as pd

from app_utils.constants.ACS import (
    ACS_ECON_METRICS,
    FAMILY_INCOME_COLUMNS,
    FAMILY_INCOME_LABELS,
)
from app_utils.data_loading import load_metrics
from app_utils.plot import make_time_series_plot


def unemployment_rate_ts_plot(filtered_unemployment_df, unemployment_df, title_geo):
    """
    Create a time series plot of the unemployment rate for the selected geography.
    """

    # Filter data based on selection
    plot_df = (
        filtered_unemployment_df.groupby("year")
        .agg(Unemployment_Rate=("Unemployment_Rate", "mean"))
        .reset_index()
    )
    plot_df["Unemployment_Rate"] = plot_df["Unemployment_Rate"] / 100
    plot_df["Geography"] = title_geo

    # Calculate the statewide avg dataframe for plotting at the statewide level
    statewide_avg_df = (
        unemployment_df.groupby("year")
        .agg(Unemployment_Rate=("Unemployment_Rate", "mean"))
        .reset_index()
        .assign(Geography="Statewide Average")
    )
    statewide_avg_df["Unemployment_Rate"] = statewide_avg_df["Unemployment_Rate"] / 100

    # If not statewide scope, concatanate the filtered line DataFrame with the statewide avg DataFrame
    if title_geo != "Vermont (Statewide)":
        plot_df = pd.concat([plot_df, statewide_avg_df], ignore_index=True)
        legend = alt.Legend(
            orient="bottom-left",
            direction="horizontal",
            offset=20,
            labelFont="Helvetica Neue",
        )
    # If we're statewide only, skip adding the comparison line and don't show the color legend
    else:
        legend = None

    # If there is not enough available data for the filtered geography,  (1 or less years)
    if len(plot_df[plot_df["Geography"] != "Statewide Average"]) <= 1:
        return None

    # Set the max and min of the y axis to frame the plotted data nicely
    ymax = plot_df["Unemployment_Rate"].max() + 0.01
    ymin = plot_df["Unemployment_Rate"].min() - 0.01

    # Create a time series plot of the unemployment rate
    return make_time_series_plot(
        df=plot_df,
        x_col="year:O",
        y_col="Unemployment_Rate:Q",
        color_col="Geography:O",
        tooltip_cols=["year", "Unemployment_Rate", "Geography"],
        title=f"Unemployment Rate Over Time | {title_geo}",
        y_axis_format="%",
        y_scale_domain=(ymin, ymax),
        color_domain=["Statewide Average", title_geo],
        color_range=["#83C299", "darkgreen"],
        legend=legend,
        height=500,
    )


def median_earnings_ts_plot(filtered_earnings_df, title_geo):
    """
    Create a time series plot of the unemployment rate for the selected geography.
    """
    # Summarize earnings by both year and variable (mean): Call the summarized variable "Median_Earnings"
    plot_df = (
        filtered_earnings_df.groupby(["year", "variable"])
        .agg(Median_Earnings=("estimate", "mean"))
        .reset_index()
    )

    # Rename variables for the labels within the legend
    variable_names = {
        "DP03_0092": "All Workers",
        "DP03_0093": "Male (FTYR)",
        "DP03_0094": "Female (FTYR)",
    }
    plot_df = plot_df.assign(Population=lambda df: df["variable"].map(variable_names))

    # Set the max and min of the y axis to frame the plotted data nicely
    ymax = plot_df["Median_Earnings"].max() + 5000
    ymin = plot_df["Median_Earnings"].min() - 15000

    # If there is not enough available data for the filtered geography,  (1 or less years)
    if len(plot_df) <= 1:
        return None

    # Create a time series plot of the median earnings for three groups over time rate
    return make_time_series_plot(
        df=plot_df,
        x_col="year:O",
        y_col="Median_Earnings:Q",
        color_col="Population:N",
        tooltip_cols=["year", "Median_Earnings", "Population"],
        title=f"Median Earnings | {title_geo}",
        y_axis_format="$,.0f",
        y_scale_domain=[ymin, ymax],
        color_domain=["All Workers", "Male (FTYR)", "Female (FTYR)"],
        color_range=["forestgreen", "dodgerblue", "deeppink"],
        legend=alt.Legend(
            orient="bottom-left",
            direction="horizontal",
            offset=20,
            labelFont="Helvetica Neue",
        ),
        height=475,
    )


def avg_commute_time_ts_plot(filtered_commute_time_df, commute_time_df, title_geo):
    """
    Create a time series plot of the unemployment rate for the selected geography.
    """
    # Summarize commute time by year (mean): Call the variable "Average_Commute"
    plot_df = (
        filtered_commute_time_df.groupby("year")
        .agg(Average_Commute=("estimate", "mean"))
        .reset_index()
    )
    # Add a geography column for comparing to the statewide average line
    plot_df["Geography"] = title_geo

    # Load the full unfiltered dataset for the statewide line
    statewide_avg_df = (
        commute_time_df.groupby("year")
        .agg(Average_Commute=("estimate", "mean"))
        .reset_index()
        .assign(Geography="Statewide Average")
    )

    # If not statewide scope, concatanate the filtered line DataFrame with the statewide avg DataFrame
    if title_geo != "Vermont (Statewide)":
        plot_df = pd.concat([plot_df, statewide_avg_df], ignore_index=True)
        legend = alt.Legend(
            orient="top", direction="horizontal", offset=0, labelFont="Helvetica Neue"
        )
    # If we're statewide only, skip adding the comparison line and don't show the color legend
    else:
        legend = None

    # If there is not enough available data for the filtered geography,  (1 or less years)
    if len(plot_df[plot_df["Geography"] != "Statewide Average"]) <= 1:
        return None

    # Set the max and min of the y axis to frame the plotted data nicely
    ymax = plot_df["Average_Commute"].max() + 5
    ymin = plot_df["Average_Commute"].min() - 5

    # Create a time series plot of average commute time
    return make_time_series_plot(
        df=plot_df,
        x_col="year:O",
        y_col="Average_Commute:Q",
        color_col="Geography:O",
        tooltip_cols=["year", "Average_Commute", "Geography"],
        title=f"Average Commuting Time | {title_geo}",
        y_axis_format=".0f",
        y_scale_domain=(ymin, ymax),
        color_domain=["Statewide Average", title_geo],
        color_range=["#83C299", "darkgreen"],
        legend=legend,
        height=450,
        title_config=dict(fontSize=19, anchor="start", dx=68, offset=10),
    )


def commute_habits_ts_plot(filtered_commute_habits_df, title_geo):
    """
    Create a time series plot of the unemployment rate for the selected geography.
    """
    # Summarize earnings by both year and variable (mean): Call the summarized variable "Percentage"
    plot_df = (
        filtered_commute_habits_df.groupby(["year", "variable"])
        .agg(Percentage=("estimate", "mean"))
        .reset_index()
    )

    # Rename variables for the labels within the legend
    variable_names = {
        "DP03_0019P": "Drove Alone",
        "DP03_0021P": "Public Transit",
        "DP03_0024P": "Work From Home",
    }
    plot_df = plot_df.assign(Commute_Type=lambda df: df["variable"].map(variable_names))
    # Turn the percentage column into a proportion (for easier axis formatting in the plot)
    plot_df["Percentage"] = plot_df["Percentage"] / 100

    # Pivot the DataFrame to calculate an 'Other' variable
    pivot_df = plot_df.pivot(
        index="year", columns="Commute_Type", values="Percentage"
    ).fillna(0)
    pivot_df["Other"] = 1.0 - pivot_df.sum(axis=1)
    other_df = (
        pivot_df[["Other"]]
        .reset_index()
        .melt(id_vars="year", var_name="Commute_Type", value_name="Percentage")
    )

    # Combine the two DataFrames so that "other" is included in the analysis
    final_plot_df = pd.concat(
        [plot_df[["year", "Commute_Type", "Percentage"]], other_df], ignore_index=True
    )

    # If there is not enough available data for the filtered geography,  (1 or less years)
    if len(final_plot_df) <= 1:
        return None

    # Create a time series plot of the modes of commute to work (% share)
    return make_time_series_plot(
        df=final_plot_df,
        x_col="year:O",
        y_col="Percentage:Q",
        color_col="Commute_Type:N",
        tooltip_cols=["year", "Percentage", "Commute_Type"],
        title=f"How People Commute to Work | {title_geo}",
        y_axis_format=".0%",
        color_domain=["Drove Alone", "Other", "Work From Home", "Public Transit"],
        color_range=["tomato", "grey", "dodgerblue", "mediumseagreen"],
        legend=alt.Legend(
            orient="top", direction="horizontal", offset=0, labelFont="Helvetica Neue"
        ),
        height=450,
        title_config=dict(fontSize=19, anchor="start", dx=78, offset=10),
    )


def build_econ_plot_dataframes(df, metrics):
    """
    Calculate a dictionary of economic dataframes
    """

    def pov_df(value):
        return pd.DataFrame(
            {
                "Category": ["Below Poverty Level", "Over Poverty Level"],
                "Value": [value, 1 - value],
            }
        )

    def mean_pct(col):
        return df[col].mean() / 100

    return {
        "public_private_coverage_df": pd.DataFrame(
            {
                "Coverage Type": ["Private Insurance", "Public Insurance"],
                "Value": [
                    1 - metrics["pct_public_hc_coverage"],
                    metrics["pct_public_hc_coverage"],
                ],
            }
        ),
        "family_income_df": pd.DataFrame(
            {
                "Family Income": FAMILY_INCOME_LABELS,
                "Estimated Families": [df[col].sum() for col in FAMILY_INCOME_COLUMNS],
            }
        ),
        "pov_people_df": pov_df(metrics["pct_people_below_pov"]),
        "pov_families_df": pov_df(metrics["pct_families_below_pov"]),
        "poverty_by_age_df": pd.DataFrame(
            {
                "Age": ["Under 18 years", "18 - 64 years", "65+ years"],
                "Poverty Rate": [
                    mean_pct("DP03_0129PE"),
                    mean_pct("DP03_0134PE"),
                    mean_pct("DP03_0135PE"),
                ],
            }
        ),
    }


def compute_econ_metrics(df):
    metrics = load_metrics(df, ACS_ECON_METRICS)

    # manual calculation
    metrics["wage_gap"] = metrics["male_earnings"] - metrics["female_earnings"]
    return metrics


def econ_df_metric_dict(filtered_gdf_2023):
    metrics = compute_econ_metrics(filtered_gdf_2023)
    dfs = build_econ_plot_dataframes(filtered_gdf_2023, metrics)
    return metrics, dfs
