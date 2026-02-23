"""
Open Research Community Accelorator
Vermont Data App

Plotting Utility Functions
"""

import altair as alt
import pandas as pd

from app_utils.analysis import get_column_type, get_skew


def make_time_series_plot(
    df,
    x_col,
    y_col,
    color_col,
    tooltip_cols,
    title,
    color_domain,
    color_range,
    y_axis_format=".0f",
    y_scale_domain=None,
    legend=None,
    height=500,
    x_label_config=None,
    title_config=None,
    stroke_dash_col=None,
    add_points=True,
):
    y_scale = (
        alt.Scale(domain=y_scale_domain)
        if y_scale_domain is not None
        else alt.Undefined
    )

    x_label_config = x_label_config or dict(labelAngle=0, labelFontSize=15)
    title_config = title_config or dict(fontSize=19, anchor="middle")

    chart = (
        alt.Chart(df)
        .mark_line(point=add_points)
        .encode(
            x=alt.X(
                x_col,
                title="Year",
                axis=alt.Axis(
                    **x_label_config,
                    labelFont="Helvetica Neue",
                    labelFontWeight="normal",
                    titleFont="Helvetica Neue",
                ),
            ),
            y=alt.Y(
                y_col,
                title=None,
                axis=alt.Axis(
                    format=y_axis_format,
                    labelFont="Helvetica Neue",
                    labelFontWeight="normal",
                    titleFont="Helvetica Neue",
                ),
                scale=y_scale,
            ),
            color=alt.Color(
                color_col,
                title=None,
                scale=alt.Scale(domain=color_domain, range=color_range),
                legend=legend,
            ),
            tooltip=[alt.Tooltip(c) for c in tooltip_cols],
        )
        .properties(height=height, title=alt.Title(title))
        .configure_title(**title_config)
        .interactive()
    )

    if stroke_dash_col:
        chart = chart.encode(
            strokeDash=alt.StrokeDash(
                stroke_dash_col, legend=alt.Legend(title=None, orient="bottom-right")
            )
        )

    return chart


def donut_chart(
    source,
    colorColumnName,
    height=300,
    width=300,
    innerRadius=90,
    fontSize=40,
    title_size=14,
    fill="mediumseagreen",
    title="Donut Chart",
    stat=0,
    text_color="grey",
    inverse=False,
):
    if inverse:
        range = ["whitesmoke", fill]
        source = source.sort_values(by=colorColumnName, ascending=False)
    else:
        range = [fill, "whitesmoke"]
        source = source.sort_values(by="Value", ascending=True)

    donut = (
        alt.Chart(source)
        .mark_arc(innerRadius=innerRadius)
        .encode(
            theta=alt.Theta("Value:Q"),
            color=alt.Color(
                f"{colorColumnName}:N", scale=alt.Scale(range=range), legend=None
            ),
            tooltip=[
                f"{colorColumnName}:N",
                alt.Tooltip("Value:Q", title="Percentage", format=".1%"),
            ],
        )
        .properties(height=height, width=width)
    )

    center_label = (
        alt.Chart(pd.DataFrame({"text": [f"{stat:.1%}"]}))
        .mark_text(
            fontSize=fontSize,
            fontWeight="lighter",
            font="Helvetica Neue",
            color=text_color,
        )
        .encode(text="text:N")
    )

    # Layer the donut and the label
    donut_chart = (
        alt.layer(donut, center_label)
        .properties(title=title)
        .configure_title(fontSize=title_size, anchor="middle")
    )

    return donut_chart


def bar_chart(
    source,
    x_col,
    y_col="Count",
    title_geo="",
    xType=":N",
    yType=":Q",
    y_tooltip_format=",.0f",
    y_axis_format=",.0f",
    x_label_angle=-50,
    fill="mediumseagreen",
    height=400,
    width=400,
    bar_width=60,
    title="Bar Chart",
    title_size=17,
    distribution=True,
    x_label_size=10.5,
    sort_order=None,
):
    tooltip_list = [x_col, alt.Tooltip(y_col, format=y_tooltip_format)]

    if sort_order is None:
        sort_order = source[x_col].tolist()

    if y_col == "Count":
        source = source.groupby(x_col).size().reset_index(name="Count")
    else:
        source = source.copy()

    if distribution:
        source[f"% of {y_col}"] = source[y_col] / source[y_col].sum()
        tooltip_list.append(alt.Tooltip(f"% of {y_col}", format=".1%"))

    bar_chart = (
        alt.Chart(source)
        .mark_bar()
        .encode(
            x=alt.X(
                f"{x_col}{xType}",
                sort=sort_order,
                axis=alt.Axis(
                    labelAngle=x_label_angle,
                    labelFont="Helvetica Neue",
                    labelFontWeight="normal",
                    labelFontSize=x_label_size,
                    titleFont="Helvetica Neue",
                ),
            ),
            y=alt.Y(
                f"{y_col}{yType}",
                axis=alt.Axis(
                    labelFont="Helvetica Neue",
                    labelFontWeight="normal",
                    titleFont="Helvetica Neue",
                    format=y_axis_format,
                ),
            ),
            tooltip=tooltip_list,
        )
        .configure_mark(color=fill, width=bar_width)
        .properties(
            height=height,
            width=width,
            title=alt.Title(
                f"{title} | {title_geo}", anchor="middle", fontSize=title_size
            ),
        )
        .interactive()
    )

    return bar_chart


def numeric_categorical_plots(df, col1, col2):
    """
    Create a boxplot and confidence interval plot
    if both a numeric and categorical variable are selected.
    """
    source = df[[col1, col2]].dropna()
    col1_type = get_column_type(df, col1)

    if col1_type in ["int64", "float64"]:
        numeric_col = col1
        non_numeric_col = col2

        multi_box = (
            alt.Chart(source)
            .mark_boxplot(size=40)
            .encode(
                x=alt.X(f"{col2}:N", sort="-y", title=col2),
                y=alt.Y(f"{col1}:Q", title=col1),
                color=alt.Color(
                    f"{col2}:N",
                    title=col2,
                    legend=None,
                    scale=alt.Scale(scheme="category20"),
                ),
                tooltip=[f"{col2}:N", f"{col1}:Q"],
            )
        )

        error_bars = (
            alt.Chart(source)
            .mark_errorbar(extent="ci")
            .encode(
                alt.X(f"{col1}").scale(zero=False),
                alt.Y(f"{col2}:O", sort="-x", title=col2),
            )
        )

        observed_points = (
            alt.Chart(source)
            .mark_point()
            .encode(
                x=alt.X(f"{col1}:Q", aggregate="mean"),
                y=alt.Y(f"{col2}:O", sort="-x", title=col2),
            )
        )

        confint_plot = error_bars + observed_points
        return multi_box, confint_plot, numeric_col, non_numeric_col

    else:
        numeric_col = col2
        non_numeric_col = col1

        multi_box = (
            alt.Chart(source)
            .mark_boxplot(size=40)
            .encode(
                x=alt.X(f"{col1}:N", sort="-y", title=col1),
                y=alt.Y(f"{col2}:Q", title=col2),
                color=alt.Color(
                    f"{col1}:N",
                    title=col1,
                    legend=None,
                    scale=alt.Scale(scheme="category20"),
                ),
                tooltip=[f"{col1}:N", f"{col2}:Q"],
            )
        )

        error_bars = (
            alt.Chart(source)
            .mark_errorbar(extent="ci")
            .encode(
                alt.X(f"{col2}").scale(zero=False),
                alt.Y(f"{col1}:O", sort="-x", title=col1),
            )
        )

        observed_points = (
            alt.Chart(source)
            .mark_point()
            .encode(
                x=alt.X(f"{col2}:Q", aggregate="mean"),
                y=alt.Y(f"{col1}:O", sort="-x", title=col1),
            )
        )

        confint_plot = error_bars + observed_points
        return multi_box, confint_plot, numeric_col, non_numeric_col


def categorical_categorical_plots(df, col1, col2):
    """
    Create a crosstab with raw counts and percentages for two categorical variables.
    """
    source = df[[col1, col2]].dropna()

    freq_table = pd.crosstab(source[col1], source[col2])
    freq_table = freq_table.div(freq_table.sum(axis=1), axis=0) * 100
    freq_table.index.name = col1
    freq_table.columns.name = col2
    freq_table = freq_table.reset_index()
    freq_table = freq_table.rename_axis(None, axis=1)

    format_dict = {
        col: "{:.1f}%"
        for col in freq_table.columns
        if pd.api.types.is_numeric_dtype(freq_table[col])
    }

    heatmap = (
        alt.Chart(source)
        .mark_rect()
        .encode(
            x=f"{col2}:O",
            y=f"{col1}:O",
            color=alt.Color("count():Q", scale=alt.Scale(scheme="blueorange")),
            tooltip=[f"{col1}:O", f"{col2}:O", "count():Q"],
        )
    )

    stacked_bar = (
        alt.Chart(source)
        .mark_bar()
        .encode(
            y=alt.Y(f"{col1}:N", title=col1),
            x=alt.X("count():Q", title="Count"),
            color=alt.Color(f"{col2}:N", title=col2),
            tooltip=[f"{col1}:O", f"{col2}:O", "count():Q"],
        )
    )

    stacked_df_100 = freq_table.melt(
        id_vars=col1, var_name="Category", value_name="Percentage"
    )

    stacked_bar_100_pct = (
        alt.Chart(stacked_df_100)
        .mark_bar()
        .encode(
            y=alt.Y(f"{col1}:O", title=None),
            x=alt.X("Percentage:Q", stack="normalize", title=f"{col2} Distribution"),
            color=alt.Color("Category:N"),
            tooltip=[
                alt.Tooltip(col1),
                alt.Tooltip("Category"),
                alt.Tooltip("Percentage:Q"),
            ],
        )
    )

    return freq_table, format_dict, heatmap, stacked_bar, stacked_bar_100_pct
