"""
Open Research Community Accelorator
Vermont Data App

Color Utility Functions
"""

import matplotlib.cm as cm


def get_colornorm_stats(df, cutoff_scalar):
    ## Simple helper func for DRY
    mean = df["Value"].mean()
    std = df["Value"].std()
    vmin = df["Value"].min()
    vmax = df["Value"].max()
    cutoff = mean + cutoff_scalar * std

    return vmin, vmax, cutoff


def map_outlier_yellow(x, cmap, norm, cutoff):
    if x > cutoff:
        return [255, 255, 0, 180]  # Yellow RGBA
    rgba = cmap(norm(x))
    return [int(c * 255) for c in rgba[:3]] + [180]


def hex_to_rgb255(hex_color):
    import matplotlib.colors as colors

    rgb = colors.to_rgb(hex_color)
    return [int(255 * c) for c in rgb] + [180]


def generate_geojson_colormap(df, column):
    unique_keys = df[column].unique()
    cmap = cm.get_cmap("tab20", len(unique_keys))
    return {
        key: [int(255 * c) for c in cmap(i)[:3]] + [180]  # RGBA
        for i, key in enumerate(unique_keys)
    }


def geojson_add_fill_colors(filtered_geojson, df, column, color_map=None):
    color_map = color_map if color_map else generate_geojson_colormap(df, column)
    for feature in filtered_geojson["features"]:
        district_type = feature["properties"].get(column)
        feature["properties"]["fill_color"] = color_map.get(
            district_type, [150, 150, 150, 180]
        )  ## default grey
    return filtered_geojson, color_map


def rgba_to_hex(rgba):
    return "#{:02x}{:02x}{:02x}{:02x}".format(*rgba)


def tab20_rgba(alpha=180):
    cmap = cm.get_cmap("tab20", 20)
    return [
        [int(255 * r), int(255 * g), int(255 * b), alpha]
        for r, g, b, _ in [cmap(i) for i in range(20)]
    ]


def add_fill_colors(df, column, cmap="tab20", alpha=180):
    """
    Add RGBA fill colors to a DataFrame based on a categorical column.

    Args:
        df (pd.DataFrame): The filtered DataFrame to modify.
        column (str): The column to base the color mapping on.
        cmap (str or Colormap): Matplotlib colormap name or object.
        alpha (int): Alpha value (0–255) to append.

    Returns:
        pd.DataFrame: A copy with a 'fill_color' column (RGBA lists).
    """
    df = df.copy()
    unique_keys = sorted(df[column].dropna().unique())
    cmap_obj = cm.get_cmap(cmap, len(unique_keys)) if isinstance(cmap, str) else cmap

    color_map = {
        key: [int(255 * c) for c in cmap_obj(i)[:3]] + [alpha]
        for i, key in enumerate(unique_keys)
    }

    df["rgba_color"] = df[column].map(
        lambda k: color_map.get(k, [150, 150, 150, alpha])
    )
    df["hex_color"] = df["rgba_color"].apply(lambda k: rgba_to_hex(k))

    return df
