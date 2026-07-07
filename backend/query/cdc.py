"""
**Author**:
    Fitz Koch
**Created**:
    2026-06-23
**Description**:
    Short description
"""

import json
import logging
from pathlib import Path

import pandas as pd
import xycmap
from matplotlib import pyplot as plt

from api.models import FilterSource
from query.processed_db import DB
from sql_render import compile_where, sql_filter_block

logger = logging.getLogger(__name__)
sql_dir = Path(__file__).resolve().parent / "sql" / "cdc"


def single_var_geojson(sources: list[FilterSource]):
    sql, params = sql_filter_block(sql_dir / "places.sql", sources)
    rows = DB.execute(sql, params).df()
    if rows.empty:
        logger.error("geo query returned no rows for filters: %s", sources)
        raise ValueError(f"no results for filters: {sources}")

    RAMP = [
        [254, 229, 217, 255],
        [252, 174, 145, 255],
        [251, 106, 74, 255],
        [222, 45, 38, 255],
        [165, 15, 21, 255],
    ]

    features = []
    for r in rows.itertuples():
        features.append(
            {
                "type": "Feature",
                "geometry": json.loads(r.geometry),
                "properties": {
                    "rgba_color": RAMP[int(r.bin)],
                    "tooltip": {"__title__": r.Measure, "value": r.Data_Value},
                },
            }
        )
    return {"type": "FeatureCollection", "features": features}


def widen_dual_var(df, measures):
    m1 = df[df.Measure == measures[0]][["LocationID", "geometry", "Data_Value", "bin"]]
    m2 = df[df.Measure == measures[1]][["LocationID", "Data_Value", "bin"]]
    wide = m1.merge(m2, on="LocationID", suffixes=("_1", "_2"))
    return wide


def build_cmap():
    # TODO: Make this a constant, don't build it each time.
    xcmap = plt.cm.Reds
    ycmap = plt.cm.Blues
    n = (3, 3)  # x, y
    cmap = xycmap.mean_xycmap(xcmap=xcmap, ycmap=ycmap, n=n)
    return cmap


def to_rgba(r, cmap):
    if pd.isna(r["bin_1"]) or pd.isna(r["bin_2"]):
        return [0, 0, 0, 0]  # transparent for missing
    rgba = cmap[int(r["bin_2"]), int(r["bin_1"])]
    return [round(c * 255) for c in rgba]


def _measure_cutpoints(measures: list[str]) -> tuple[list[float], list[float]]:
    """Bin edges for each measure from the precomputed cdc_edges table."""
    params: list = []
    where_string = compile_where({"Measure": measures}, params)
    sql = f"SELECT * FROM cdc_edges {where_string}"
    edges = DB.execute(sql, params).df()
    edges_x = (
        edges[edges["Measure"] == measures[0]].drop(columns="Measure").iloc[0].tolist()
    )
    edges_y = (
        edges[edges["Measure"] == measures[1]].drop(columns="Measure").iloc[0].tolist()
    )
    return edges_x, edges_y


def dual_var_comparison(
    sources: list[FilterSource], geoLevel="county_places"
) -> tuple[dict, dict]:
    """GeoJSON + legend for a two-measure bivariate comparison map.

    Returns (geojson, legend). Both are derived from the SAME cmap in one pass,
    so the legend grid always matches the map's fill colors.
    """
    measures = [m for source in sources for m in source.filters.get("Measure", [])]
    if len(measures) != 2:
        raise ValueError(f"expected exactly 2 measures, got: {measures}")

    # Both measures ride in one merged FilterSource so the shared places.sql
    # template serves the single- and dual-variable cases alike.
    table = "cdc_county_places" if geoLevel == "county_places" else "cdc_tract_places"
    merged = FilterSource(filter_table=table, filters={"Measure": measures})
    sql_path = sql_dir / f"{geoLevel}.sql"
    sql, params = sql_filter_block(sql_path, [merged])
    df = DB.execute(sql, params).df()
    df = widen_dual_var(df, measures)

    cmap = build_cmap()
    features = []
    for r in df.itertuples():
        color = to_rgba({"bin_1": r.bin_1, "bin_2": r.bin_2}, cmap)
        features.append(
            {
                "type": "Feature",
                "geometry": json.loads(r.geometry),
                "properties": {
                    "rgba_color": color,
                    "tooltip": {
                        "__title__": "Variable Comparison",
                        f"{measures[0]}": r.Data_Value_1,
                        f"{measures[1]}": r.Data_Value_2,
                    },
                },
            }
        )
    geojson = {"type": "FeatureCollection", "features": features}

    grid = [[[round(c * 255) for c in cmap[y, x]] for x in range(3)] for y in range(3)]
    edges_x, edges_y = _measure_cutpoints(measures)
    legend = {
        "grid": grid,
        "measures": measures,
        "edges_x": edges_x,
        "edges_y": edges_y,
    }
    return geojson, legend
