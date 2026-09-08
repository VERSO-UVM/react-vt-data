"""
**Description**:
    Generic cross-dataset bivariate comparison + composite index, generalizing
    the CDC-only implementation in query/cdc.py to any registered long/tidy
    dataset (demographics, housing, education, economics, ...).

    Each dataset exposes one or more geography "levels" (county, town, tract).
    A level's config names the source table plus the columns that carry the
    variable name, its value, the geometry-join id, and a display name, so the
    same pivot/bin/color pipeline works for every dataset without per-domain
    branching in the route layer.
"""

import json
import logging
from pathlib import Path

import pandas as pd
from sklearn.decomposition import PCA

from api.models import FilterSource
from app_utils.sql_render import sql_filter_block
from query.cdc import build_cmap, to_rgba
from query.production_db import get_db

DB = get_db()

logger = logging.getLogger(__name__)
sql_dir = Path(__file__).resolve().parent / "sql"

MIN_COMPLETE_ROWS = 3  # fewest geographies a composite index can be fit from
# Census ACS sentinel for a suppressed/not-applicable estimate (e.g. median age
# in a town too small to estimate). Never a real value, so drop it up front.
ACS_SENTINEL = -666666666


def _acs5_dataset(table: str, label: str) -> dict:
    """Registry entry for one of the ACS5 tidy tables.

    County and town share one physical table, discriminated by `geo_type`.
    """
    return {
        "label": label,
        # canonical table used to build the Section/Variable picker, regardless
        # of which level is currently selected (the variable catalog doesn't
        # vary by geography level).
        "filter_table": table,
        "levels": {
            "county": {
                "sql": sql_dir / "acs5" / "acs5_county_compare.sql",
                "table": table,
                "var_col": "Variable",
                "value_col": "Value",
                "id_col": "CountyFIPS",
                "name_col": "CountyName",
                "geo_type": "county",
            },
            "town": {
                "sql": sql_dir / "acs5" / "acs5_town_compare.sql",
                "table": table,
                "var_col": "Variable",
                "value_col": "Value",
                "id_col": "FIPS_ID",
                "name_col": "TOWN_NAME",
                "geo_type": "county_subdivision",
            },
        },
    }


DATASETS: dict[str, dict] = {
    "cdc": {
        "label": "Community Health (CDC Places)",
        "filter_table": "cdc_places_county",
        "levels": {
            "county": {
                "sql": sql_dir / "cdc" / "county_places.sql",
                "table": "cdc_places_county",
                # Matches schema.json's cdc_places_county entry, which the
                # canonical filter_table (used for both county and tract) is
                # resolved against -- var_col must match the column name
                # spec_to_source maps "Measure" onto, not the raw table's
                # (lowercase) storage casing.
                "var_col": "Measure",
                "value_col": "Data_Value",
                "id_col": "CountyFIPS",
                "name_col": "CountyName",
            },
            "tract": {
                "sql": sql_dir / "cdc" / "tract_places.sql",
                "table": "cdc_places_tract",
                "var_col": "Measure",
                "value_col": "Data_Value",
                "id_col": "locationid",
                "name_col": "name",
            },
        },
    },
    "demographics": _acs5_dataset("acs5_demographics_tidy", "Demographics"),
    "housing": _acs5_dataset("acs5_housing_tidy", "Housing"),
    "education": _acs5_dataset("acs5_education_tidy", "Education"),
    "economics": _acs5_dataset("acs5_economics_tidy", "Economics"),
}


def dataset_registry() -> dict:
    """Everything the frontend needs to build the dataset/level/variable UI."""
    return {
        key: {
            "label": cfg["label"],
            "filter_table": cfg["filter_table"],
            "levels": list(cfg["levels"].keys()),
        }
        for key, cfg in DATASETS.items()
    }


def level_config(dataset: str, level: str) -> dict:
    try:
        return DATASETS[dataset]["levels"][level]
    except KeyError as e:
        raise ValueError(f"unknown dataset/level: {dataset}/{level}") from e


# every dataset's canonical filter_table is unique, so a Cascade filter's
# table name alone identifies which dataset it picked from.
TABLE_TO_DATASET: dict[str, str] = {
    cfg["filter_table"]: key for key, cfg in DATASETS.items()
}


def dataset_for_table(table: str) -> str:
    try:
        return TABLE_TO_DATASET[table]
    except KeyError as e:
        raise ValueError(f"unregistered comparison table: {table}") from e


def _fetch(cfg: dict, extra_filters: dict | None = None) -> pd.DataFrame:
    filters = dict(extra_filters or {})
    if "geo_type" in cfg:
        filters["geo_type"] = [cfg["geo_type"]]

    source = FilterSource(filter_table=cfg["table"], filters=filters)
    sql, params = sql_filter_block(cfg["sql"], [source])
    df = DB.execute(sql, params).df()

    df = df.rename(
        columns={
            cfg["var_col"]: "measure",
            cfg["value_col"]: "data_value",
            cfg["id_col"]: "geoid",
            cfg["name_col"]: "name",
        }
    )
    return df[df["data_value"] != ACS_SENTINEL]


def _bin3(series: pd.Series) -> tuple[pd.Series, list[float]]:
    """Tertile bin codes (0/1/2) plus the bin edges, computed on the fly.

    Ties can collapse tertiles into fewer groups for small/skewed samples
    (e.g. 14 counties); `duplicates="drop"` keeps that from raising.
    """
    codes, edges = pd.qcut(series, 3, labels=False, duplicates="drop", retbins=True)
    return codes, list(edges)


def _single_variable(dataset: str, level: str, var: str) -> pd.DataFrame:
    cfg = level_config(dataset, level)
    df = _fetch(cfg, {cfg["var_col"]: [var]})
    sub = df[df["measure"] == var][["geoid", "geometry", "data_value", "name"]].copy()
    if sub.empty:
        raise ValueError(f"no data for {dataset}/{level}: {var!r}")
    return sub


def compare_variables(
    dataset1: str, level: str, var1: str, dataset2: str, var2: str
) -> tuple[dict, dict]:
    """Bivariate comparison map: geojson in `data`, legend in `metadata`.

    Mirrors query.cdc.dual_var_comparison, generalized to any registered
    dataset/level via its column config instead of hardcoded CDC column names.
    The two variables can come from different datasets (e.g. Unemployment
    Rate from `economics` vs. White from `demographics`) as long as both
    support `level` -- each side is fetched independently and merged on
    `geoid`, which is stable across datasets because every county/town-level
    query joins through the same vt_county_lines_geom/vt_town_lines_geom
    tables.
    """
    d1 = _single_variable(dataset1, level, var1)
    d2 = _single_variable(dataset2, level, var2)[["geoid", "data_value"]]

    d1["bin"], edges_x = _bin3(d1["data_value"])
    d2["bin"], edges_y = _bin3(d2["data_value"])

    wide = d1.merge(d2, on="geoid", suffixes=("_1", "_2")).dropna(
        subset=["bin_1", "bin_2"]
    )
    if wide.empty:
        raise ValueError(
            f"no shared geographies between {dataset1}/{var1!r} and "
            f"{dataset2}/{var2!r} at the {level} level"
        )

    cmap = build_cmap()
    features = []
    for r in wide.itertuples():
        color = to_rgba({"bin_1": r.bin_1, "bin_2": r.bin_2}, cmap)
        tooltip = {
            "__title__": r.name.lower().title(),
            var1: round(r.data_value_1, 2),
            var2: round(r.data_value_2, 2),
        }
        features.append(
            {
                "type": "Feature",
                "geometry": json.loads(r.geometry),
                "properties": {"rgba_color": color, "tooltip": tooltip},
            }
        )
    geojson = {"type": "FeatureCollection", "features": features}

    grid = [[[round(c * 255) for c in cmap[y, x]] for x in range(3)] for y in range(3)]
    legend = {
        "grid": grid,
        "measures": [var1, var2],
        "edges_x": edges_x,
        "edges_y": edges_y,
    }
    return geojson, legend


def composite_index(dataset: str, level: str) -> list[dict]:
    """A single-component PCA summary across every variable in the dataset.

    Standardized against the dataset's own mean/std (relative to the Vermont
    average for this level), NOT a national baseline -- unlike CDC's
    precomputed cdc_pca_county table, this is computed live so it works for
    any dataset/level without a per-domain ETL step.
    """
    cfg = level_config(dataset, level)
    df = _fetch(cfg)
    if df.empty:
        raise ValueError(f"no results for {dataset}/{level}")

    pivot = df.pivot_table(
        index=["geoid", "name"], columns="measure", values="data_value", aggfunc="first"
    )

    numeric = pivot.select_dtypes(include="number")
    # drop measures missing for more than 10% of geographies, then keep only
    # geographies with complete data across what's left
    numeric = numeric.dropna(axis=1, thresh=int(len(numeric) * 0.9))
    numeric = numeric.dropna(axis=0, how="any")

    std = numeric.std()
    numeric = numeric.loc[:, std > 0]  # drop constant measures

    if numeric.shape[1] < 2 or numeric.shape[0] < MIN_COMPLETE_ROWS:
        raise ValueError(
            f"not enough shared data to build a composite index: {dataset}/{level}"
        )

    standardized = (numeric - numeric.mean()) / numeric.std()
    pca = PCA(n_components=1)
    scores = pca.fit_transform(standardized)[:, 0]

    # orient so a higher score reads as "higher on most component measures"
    if pca.components_[0].sum() < 0:
        scores = -scores

    out = numeric.reset_index()[["geoid", "name"]].copy()
    out["Composite Index"] = scores.round(2)
    out = out.sort_values("name").rename(columns={"name": "Name"})
    return out[["Name", "Composite Index"]].to_dict(orient="records")
