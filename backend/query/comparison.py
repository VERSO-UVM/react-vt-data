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
from datetime import datetime
from pathlib import Path

import pandas as pd
from sklearn.decomposition import PCA

from api.models import FilterSource
from query.cdc import build_cmap, to_rgba
from query.production_db import get_db
from query.sql_render import sql_filter_block

DB = get_db()

logger = logging.getLogger(__name__)
sql_dir = Path(__file__).resolve().parent / "sql"

MIN_COMPLETE_ROWS = 3  # fewest geographies a composite index can be fit from
# Census ACS sentinel for a suppressed/not-applicable estimate (e.g. median age
# in a town too small to estimate). Never a real value, so drop it up front.
ACS_SENTINEL = -666666666
# Vintages this recent aren't final yet (ACS5/CDC Places both lag ~2 years),
# so the newest year at or before this is the one used per table.
MAX_YEAR = datetime.now().year - 2


class NoDataError(ValueError):
    def __init__(self, dataset: str, variable: str, level: str):
        super().__init__(f"No data for {dataset}/{level}: {variable!r}")
        self.dataset = dataset
        self.variable = variable
        self.level = level


class NoOverlapError(ValueError):
    def __init__(self, dataset1: str, var1: str, dataset2: str, var2: str, level: str):
        super().__init__(
            f"{var1} and {var2} don't share any geographies at the {level} level — try a different pair or geography level."
        )
        self.dataset1 = dataset1
        self.var1 = var1
        self.dataset2 = dataset2
        self.var2 = var2
        self.level = level


def _latest_year(table: str) -> str:
    """Most recent `year` in `table` at or before MAX_YEAR.

    Every registered table is a long/tidy series with one row per
    (geography, variable, year) -- left unfiltered, a single Variable pick
    returns one row per year stacked on top of each other, which both
    inflates the comparison map with duplicate geometries and defeats the
    scatter's one-dot-per-geography expectation. `year` is stored as text
    (matches the rest of this codebase's ACS5 columns), hence the cast.
    """
    row = DB.execute(
        f'SELECT MAX(TRY_CAST("year" AS INTEGER)) '
        f'FROM {table} WHERE TRY_CAST("year" AS INTEGER) <= ?',
        [MAX_YEAR],
    ).fetchone()
    year = row[0] if row else None
    if year is None:
        raise ValueError(f"no data at or before {MAX_YEAR} in {table}")
    return str(year)


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
                "var_col": "variable",
                "value_col": "value",
                "id_col": "geoid",
                "name_col": "county",
                "geo_type": "county",
            },
            "town": {
                "sql": sql_dir / "acs5" / "acs5_town_compare.sql",
                "table": table,
                "var_col": "variable",
                "value_col": "value",
                "id_col": "FIPS_ID",
                "name_col": "TOWN_NAME",
                "geo_type": "town",
            },
        },
    }


DATASETS: dict[str, dict] = {
    "cdc": {
        "label": "Community Health",
        "filter_table": "cdc_places_county",
        "levels": {
            "county": {
                "sql": sql_dir / "cdc" / "county_places.sql",
                "table": "cdc_places_county",
                # Matches schema.json's cdc_places_county entry -- var_col
                # must match the column name spec_to_source maps "Measure"
                # onto.
                "filter_table": "cdc_places_county",
                "var_col": "measure",
                "value_col": "data_value",
                "id_col": "geoid",
                "name_col": "county",
            },
            "tract": {
                "sql": sql_dir / "cdc" / "tract_places.sql",
                "table": "cdc_places_tract",
                # CDC PLACES only computes age-adjusted prevalence at the
                # county/place level -- census tracts publish crude
                # prevalence only (too few people per age group to adjust).
                # The Variable picker must read its tree from this table,
                # not cdc_places_county, or it would keep offering
                # "Age-adjusted prevalence" here against zero matching rows.
                # https://www.cdc.gov/places/faqs/using-data/index.html
                "filter_table": "cdc_places_tract",
                "var_col": "measure",
                "value_col": "data_value",
                "id_col": "geoid",
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
            # Usually the same table for every level -- CDC is the
            # exception, since its Variable/Prevalence Measure options differ
            # between county and tract (see the "tract" level's comment
            # above). The frontend should prefer this over the flat
            # `filter_table` above when building a level-specific picker.
            "level_filter_tables": {
                lvl: lvl_cfg.get("filter_table", cfg["filter_table"])
                for lvl, lvl_cfg in cfg["levels"].items()
            },
        }
        for key, cfg in DATASETS.items()
    }


def level_config(dataset: str, level: str) -> dict:
    try:
        return DATASETS[dataset]["levels"][level]
    except KeyError as e:
        raise ValueError(f"unknown dataset/level: {dataset}/{level}") from e


# Every filter_table a Cascade filter could point at -- a dataset's canonical
# one plus any level-specific override (e.g. CDC's tract table) -- is unique
# across datasets, so a spec's table name alone identifies which dataset it
# picked from.
def _build_table_to_dataset() -> dict[str, str]:
    mapping: dict[str, str] = {}
    for key, cfg in DATASETS.items():
        mapping[cfg["filter_table"]] = key
        for lvl_cfg in cfg["levels"].values():
            mapping[lvl_cfg.get("filter_table", cfg["filter_table"])] = key
    return mapping


TABLE_TO_DATASET: dict[str, str] = _build_table_to_dataset()


def dataset_for_table(table: str) -> str:
    try:
        return TABLE_TO_DATASET[table]
    except KeyError as e:
        raise ValueError(f"unregistered comparison table: {table}") from e


def _fetch(cfg: dict, extra_filters: dict | None = None) -> pd.DataFrame:
    filters = dict(extra_filters or {})
    if "geo_type" in cfg:
        filters["geo_type"] = [cfg["geo_type"]]
    filters["year"] = [_latest_year(cfg["table"])]

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


def _single_variable(
    dataset: str, level: str, var: str, extra_filters: dict | None = None
) -> pd.DataFrame:
    cfg = level_config(dataset, level)
    filters = dict(extra_filters or {})
    filters[cfg["var_col"]] = [var]
    df = _fetch(cfg, filters)
    sub = df[df["measure"] == var][["geoid", "geometry", "data_value", "name"]].copy()
    # Rows whose Jurisdiction/geo-id failed to match a geometry (a handful of
    # unparsed or non-geographic entries in the source tidy table) carry no
    # geoid at all. Left in, two such rows from either side of a comparison
    # collapse together on the shared NaN "geoid" during the merge below,
    # producing a bogus cross product of geometry-less, name-less features.
    sub = sub.dropna(subset=["geoid"])
    if sub.empty:
        raise NoDataError(dataset=dataset, variable=var, level=level)
    return sub


def compare_variables(
    dataset1: str,
    level: str,
    var1: str,
    dataset2: str,
    var2: str,
    filters1: dict | None = None,
    filters2: dict | None = None,
) -> tuple[dict, dict]:
    """Bivariate comparison map: geojson in `data`, legend in `metadata`.

    Mirrors query.cdc.dual_var_comparison, generalized to any registered
    dataset/level via its column config instead of hardcoded CDC column names.
    The two variables can come from different datasets (e.g. Unemployment
    Rate from `economics` vs. White from `demographics`) as long as both
    support `level` -- each side is fetched independently and merged on
    `geoid`, which is stable across datasets because every county/town-level
    query joins through the same vt_county_lines_geom/vt_town_lines_geom
    tables (all keyed by the standardized geoid).

    `filters1`/`filters2` carry any *other* cascade picks alongside the
    variable itself (e.g. CDC's Prevalence Measure sits one level below
    Measure -- without it, "Any disability among adults" still matches both
    its Crude and Age-adjusted rows, doubling every geography on the map).
    """
    d1 = _single_variable(dataset1, level, var1, filters1)
    d2 = _single_variable(dataset2, level, var2, filters2)[["geoid", "data_value"]]

    d1["bin"], edges_x = _bin3(d1["data_value"])
    d2["bin"], edges_y = _bin3(d2["data_value"])

    wide = d1.merge(d2, on="geoid", suffixes=("_1", "_2")).dropna(
        subset=["bin_1", "bin_2"]
    )
    if wide.empty:
        raise NoOverlapError(
            dataset1=dataset1, var1=var1, dataset2=dataset2, var2=var2, level=level
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
