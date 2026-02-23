from app_utils.color import jenks_color_map
from app_utils.mapping import add_tooltip_from_dict


def fill_census_colors(gdf, map_color):
    jenks_cmap_dict = jenks_color_map(gdf, 10, map_color)
    gdf["rgba_color"] = gdf["color_groups"].astype(str).map(jenks_cmap_dict)
    gdf["rgba_color"] = gdf["rgba_color"].fillna("(0, 0, 0, 0)")
    return gdf


def add_census_tooltip(gdf, selected_values):
    tooltip_fmt = f"{selected_values['Variable']} {selected_values['Measure']}".upper()
    return add_tooltip_from_dict(
        gdf, label_to_col={"Municipality": "Jurisdiction", tooltip_fmt: "Value"}
    )


def process_census_data(gdf, selected_values, map_color):
    gdf = fill_census_colors(gdf, map_color)
    gdf = add_census_tooltip(gdf, selected_values)
    gdf["coordinates"] = gdf.geometry.apply(
        lambda geom: geom.__geo_interface__["coordinates"]
    )
    return gdf
