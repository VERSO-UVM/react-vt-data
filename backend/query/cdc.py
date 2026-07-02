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
from query.core_functions import (
    sql_filter_block,
)
from query.processed_db import DB

logger = logging.getLogger(__name__)
sql_dir = Path(__file__).resolve().parent / "sql" / "cdc"


def single_var_geojson(sources: list[FilterSource]):
    sql = sql_filter_block(sql_dir / "places.sql", sources=sources)
    rows = DB.execute(sql).df()
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


def dual_var_geojson(sources: list[FilterSource]):
    """
    Note: currently just filtering
    """
    # sql = sql_filter_block(sql_dir / "places_two_hard.sql", sources=sources)
    measures = measures = [
        m for source in sources for m in source.filters.get("Measure", [])
    ]
    where_string = f"WHERE Measure IN ({', '.join(repr(m) for m in measures)})"
    sql = (sql_dir / "places.sql").read_text().format(where_string=where_string)
    df = DB.execute(sql).df()
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
    return {"type": "FeatureCollection", "features": features}


def get_measure_cutpoints(sources: list[FilterSource]):
    measures = [m for source in sources for m in source.filters.get("Measure", [])]
    cmap = build_cmap()
    grid = [[[round(c * 255) for c in cmap[y, x]] for x in range(3)] for y in range(3)]
    where_string = f"WHERE Measure IN ({', '.join(repr(m) for m in measures)})"
    sql = f"""--sql
        SELECT * FROM cdc_edges
        {where_string}
    """
    edges = DB.execute(sql).df()
    edges_x = (
        edges[edges["Measure"] == measures[0]].drop(columns="Measure").iloc[0].tolist()
    )
    edges_y = (
        edges[edges["Measure"] == measures[1]].drop(columns="Measure").iloc[0].tolist()
    )

    return {"grid": grid, "measures": measures, "edges_x": edges_x, "edges_y": edges_y}
