"""
Open Research Community Accelorator
Vermont Data App

Color Utility Functions
"""

import matplotlib.cm as cm


def rgba_to_hex(rgba):
    return "#{:02x}{:02x}{:02x}{:02x}".format(*rgba)


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
