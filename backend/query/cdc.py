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
from query.core_functions import to_export_geo
from query.production_db import get_db
from query.sql_render import compile_where, sql_filter_block

DB = get_db()

logger = logging.getLogger(__name__)
sql_dir = Path(__file__).resolve().parent / "sql" / "cdc"


def single_var_geojson(sources: list[FilterSource]):
    sql, params = sql_filter_block(sql_dir / "county_places.sql", sources)
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
                    "tooltip": {"__title__": r.measure, "value": r.data_value},
                },
            }
        )
    return {"type": "FeatureCollection", "features": features}


def widen_dual_var(df, measures):
    cols = ["geoid", "geometry", "data_value", "bin", "natl_pct", "county"]
    m1 = df[df.measure == measures[0]][[c for c in cols if c in df.columns]]
    m2 = df[df.measure == measures[1]][["geoid", "data_value", "bin"]]
    wide = m1.merge(m2, on="geoid", suffixes=("_1", "_2"))
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
    where_string = compile_where({"measure": measures}, params)
    sql = f"SELECT * FROM cdc_edges_county {where_string}"
    edges = DB.execute(sql, params).df()
    edges_x = (
        edges[edges["measure"] == measures[0]].drop(columns="measure").iloc[0].tolist()
    )
    edges_y = (
        edges[edges["measure"] == measures[1]].drop(columns="measure").iloc[0].tolist()
    )
    return edges_x, edges_y


def dual_var_comparison(
    sources: list[FilterSource], geoLevel="county_places"
) -> tuple[dict, dict]:
    """GeoJSON + legend for a two-measure bivariate comparison map.

    Returns (geojson, legend). Both are derived from the SAME cmap in one pass,
    so the legend grid always matches the map's fill colors.
    """
    measures = [m for source in sources for m in source.filters.get("measure", [])]
    if len(measures) != 2:
        raise ValueError(f"expected exactly 2 measures, got: {measures}")

    # Both measures ride in one merged FilterSource so the shared places.sql
    # template serves the single- and dual-variable cases alike.
    table = "cdc_places_county" if geoLevel == "county_places" else "cdc_places_tract"
    merged = FilterSource(filter_table=table, filters={"measure": measures})
    sql_path = sql_dir / f"{geoLevel}.sql"

    sql, params = sql_filter_block(sql_path, [merged])
    df = DB.execute(sql, params).df()

    df = widen_dual_var(df, measures)

    cmap = build_cmap()
    features = []
    for r in df.itertuples():
        color = to_rgba({"bin_1": r.bin_1, "bin_2": r.bin_2}, cmap)
        tooltip = {
            "__title__": "Variable Comparison",
            f"{measures[0]}": r.data_value_1,
            f"{measures[1]}": r.data_value_2,
            "National Percentage": r.natl_pct,
        }
        ## add in County Name if we're in county space.
        if "county" in df.columns:
            tooltip["County"] = r.county
        features.append(
            {
                "type": "Feature",
                "geometry": json.loads(r.geometry),
                "properties": {"rgba_color": color, "tooltip": tooltip},
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


def get_cdc_places_tidy(sources: list[FilterSource]) -> pd.DataFrame:
    """Tidy CDC PLACES rows (one per measure) for the given county filter.

    One county returns its own estimates. With no county filter (a statewide
    pick), each measure is an adult-population-weighted average of all
    counties, since CDC publishes no Vermont-wide PLACES estimate; see
    places_tidy.sql.

    Pinned to age-adjusted prevalence — CDC PLACES publishes both crude and
    age-adjusted estimates per measure, and mixing them would double every
    row and isn't comparable across counties with different age structures.
    """
    for source in sources:
        source.filters = {
            **source.filters,
            "data_value_type": ["Age-adjusted prevalence"],
        }

    sql, params = sql_filter_block(sql_dir / "places_tidy.sql", sources)
    result = DB.execute(sql, params).df()

    if result.empty:
        logger.error("CDC PLACES tidy query returned no rows for filters: %s", sources)
        raise ValueError(f"no results for filters: {sources}")

    return result


def get_cdc_county_pca():
    df = DB.execute(
        """--sql
        SELECT
            i.LocationID,
            ROUND(i.pca_score, 2) AS "Health Burden",
            c.county AS CountyName
        FROM cdc_pca_county AS i
        LEFT JOIN vt_county_lines_geom AS c
            ON i.LocationID = c.geoid
        """
    ).df()

    df["CountyName"] = df["CountyName"].str.title()
    df = df.sort_values(by="CountyName")

    return df[["CountyName", "Health Burden"]].to_dict(orient="records")


def get_cdc_export_table(table: str) -> pd.DataFrame:
    """Load a full CDC PLACES table for CSV export, with the county column
    named `County` like every other export source."""
    return to_export_geo(DB.execute(f'SELECT * FROM "{table}"').df())
