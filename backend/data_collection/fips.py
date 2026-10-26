"""
**Author**:
    Ian Sargent
**Created**:
    2026-08-13
**Description**:
    Fetches the raw Vermont boundary data files
    from the GitHub repository
"""

import geopandas as gpd
import pandas as pd
from pyogrio import read_dataframe

COUNTY_LINES_URL = "https://raw.githubusercontent.com/VERSO-UVM/react-vt-data/refs/heads/main/backend/Data/vermont/countyLines.geojson"
MUNICIPALITIES_URL = "https://raw.githubusercontent.com/VERSO-UVM/react-vt-data/refs/heads/main/backend/Data/vermont/municipalities.json"
TRACTS_URL = "https://raw.githubusercontent.com/VERSO-UVM/react-vt-data/main/backend/Data/vermont/cb_2025_50_tract_500k/cb_2025_50_tract_500k.shp"

# ---------------------------------------------------------------------------
# Validation rules
# ---------------------------------------------------------------------------

STATE_FIPS = "50"

# Expected columns and their kind ("str", "int" or "geometry"), per table.
# The column set must match exactly: a missing or extra column fails.
EXPECTED_SCHEMAS: dict[str, dict[str, str]] = {
    "vt_county_lines": {
        "OBJECTID": "int",
        "CNTY": "int",
        "CNTYNAME": "str",
        "CNTYGEOID": "str",
        "geometry": "geometry",
    },
    "vt_town_lines": {
        "id": "str",
        "GEOID": "str",
        "NAME": "str",
        "geometry": "geometry",
    },
    "vt_tract_lines": {
        "STATEFP": "str",
        "COUNTYFP": "str",
        "TRACTCE": "str",
        "GEOIDFQ": "str",
        "GEOID": "str",
        "NAME": "str",
        "NAMELSAD": "str",
        "STUSPS": "str",
        "NAMELSADCO": "str",
        "STATE_NAME": "str",
        "LSAD": "str",
        "ALAND": "int",
        "AWATER": "int",
        "geometry": "geometry",
    },
}

# Exact row count per table. Vermont's boundaries rarely change; when they do,
# update the count on purpose.
EXPECTED_ROWS: dict[str, int] = {
    "vt_county_lines": 14,
    "vt_town_lines": 256,
    "vt_tract_lines": 193,
}

# Key column and its digit length, per table.
ID_COLUMNS: dict[str, tuple[str, int]] = {
    "vt_county_lines": ("CNTYGEOID", 5),
    "vt_town_lines": ("GEOID", 10),
    "vt_tract_lines": ("GEOID", 11),
}

VT_COUNTY_NAMES = frozenset(
    {
        "ADDISON",
        "BENNINGTON",
        "CALEDONIA",
        "CHITTENDEN",
        "ESSEX",
        "FRANKLIN",
        "GRAND ISLE",
        "LAMOILLE",
        "ORANGE",
        "ORLEANS",
        "RUTLAND",
        "WASHINGTON",
        "WINDHAM",
        "WINDSOR",
    }
)

# Approximate Vermont bounding box (min lon, min lat, max lon, max lat), with
# a small margin. Checked in the source CRS's degrees (4326 or 4269).
VT_BOUNDS = (-73.5, 42.7, -71.4, 45.1)


class FipsValidationError(Exception):
    """Raised when the collected boundary tables fail validation."""


# Fetch county lines from github repo (geojson file)
def fetch_counties() -> pd.DataFrame:
    return read_dataframe(COUNTY_LINES_URL)


# Fetch town lines from github repo (json file)
def fetch_towns() -> pd.DataFrame:
    return read_dataframe(MUNICIPALITIES_URL)


# Fetch census tract lines from github repo (shp file)
def fetch_tracts() -> pd.DataFrame:
    return read_dataframe(TRACTS_URL)


# ---------------------------------------------------------------------------
# Per-table checks. Each returns a list of problems; empty means it passed.
# ---------------------------------------------------------------------------


def check_schema(name: str, df: pd.DataFrame) -> list[str]:
    """Columns match EXPECTED_SCHEMAS[name] exactly, each of the right kind."""
    expected = EXPECTED_SCHEMAS[name]
    problems = []
    for col in sorted(set(expected) - set(df.columns)):
        problems.append(f"{name}: missing column: {col}")
    for col in sorted(set(df.columns) - set(expected)):
        problems.append(f"{name}: unexpected column: {col}")

    # Check the kind of each expected column that is present
    for col, kind in expected.items():
        if col in df.columns and not _is_kind(df[col], kind):
            problems.append(f"{name}: {col} should be {kind}, got {df[col].dtype}")

    return problems


def _is_kind(series: pd.Series, kind: str) -> bool:
    """True if the column's dtype matches a kind in EXPECTED_SCHEMAS."""
    if kind == "int":
        return pd.api.types.is_integer_dtype(series)
    if kind == "str":
        return pd.api.types.is_string_dtype(series)
    if kind == "geometry":
        return series.dtype == "geometry"
    raise ValueError(f"Unknown column kind: {kind}")


def check_row_count(name: str, df: pd.DataFrame) -> list[str]:
    """Row count equals EXPECTED_ROWS[name]."""
    expected = EXPECTED_ROWS[name]
    actual = len(df)
    if actual != expected:
        return [f"{name}: expected {expected} rows, got {actual}"]
    return []


def check_ids(name: str, df: pd.DataFrame) -> list[str]:
    """The ID column has no nulls or duplicates, and every value is all
    digits, the expected length, and starts with STATE_FIPS."""
    column_name, expected_length = ID_COLUMNS[name]
    if column_name not in df.columns:
        return []  # check_schema reports the missing column
    problems = []

    ids = df[column_name]
    if ids.isna().any():
        problems.append(f"{name}: {column_name} has nulls")

    # Nulls are reported above; leave them out of the remaining steps
    ids = ids.dropna().astype(str)
    duplicates = ids[ids.duplicated()]
    if not duplicates.empty:
        problems.append(f"{name}: {column_name} has duplicates: {_join(duplicates)}")

    # "50" followed by the rest of the digits, e.g. 50 + 8 digits for towns
    pattern = rf"{STATE_FIPS}\d{{{expected_length - len(STATE_FIPS)}}}"
    bad = ids[~ids.str.fullmatch(pattern)]
    if not bad.empty:
        problems.append(f"{name}: {column_name} badly formatted: {_join(bad)}")

    return problems


def check_geometry(name: str, df: gpd.GeoDataFrame) -> list[str]:
    """A CRS is declared, and every shape is a non-empty, valid Polygon or
    MultiPolygon inside VT_BOUNDS."""
    if "geometry" not in df.columns:
        return []  # check_schema reports the missing column
    problems = []

    if df.crs is None:
        problems.append(f"{name}: no CRS declared")

    geom = df.geometry
    ids = _row_ids(name, df)

    null = geom.isna()
    empty = ~null & geom.is_empty
    # Only shapes that exist can be checked for type, validity and location
    present = ~null & ~empty
    wrong_type = present & ~geom.geom_type.isin(["Polygon", "MultiPolygon"])
    invalid = present & ~geom.is_valid

    min_lon, min_lat, max_lon, max_lat = VT_BOUNDS
    bounds = geom.bounds
    outside = present & ~(
        (bounds["minx"] >= min_lon)
        & (bounds["miny"] >= min_lat)
        & (bounds["maxx"] <= max_lon)
        & (bounds["maxy"] <= max_lat)
    )

    for mask, what in [
        (null, "null geometry"),
        (empty, "empty geometry"),
        (wrong_type, "geometry is not a Polygon or MultiPolygon"),
        (invalid, "invalid geometry"),
        (outside, "geometry outside Vermont"),
    ]:
        if mask.any():
            problems.append(f"{name}: {what}: {_join(ids[mask])}")

    return problems


def check_counties(df: pd.DataFrame) -> list[str]:
    """County-only: CNTYNAME is one of VT_COUNTY_NAMES, and CNTYGEOID equals
    STATE_FIPS + the zero-padded CNTY."""
    name = "vt_county_lines"
    problems = []

    if "CNTYNAME" in df.columns:
        names = df["CNTYNAME"].dropna()
        unknown = names[~names.isin(VT_COUNTY_NAMES)]
        if not unknown.empty:
            problems.append(f"{name}: unknown county name: {_join(unknown)}")

    if {"CNTY", "CNTYGEOID"} <= set(df.columns):
        # CNTY 7 -> "50007"
        expected = STATE_FIPS + df["CNTY"].astype(str).str.zfill(3)
        mismatch = df["CNTYGEOID"].astype(str) != expected
        if mismatch.any():
            problems.append(
                f"{name}: CNTYGEOID does not match CNTY: "
                f"{_join(df.loc[mismatch, 'CNTYGEOID'])}"
            )

    return problems


# ---------------------------------------------------------------------------
# Cross-table check
# ---------------------------------------------------------------------------


def check_nesting(tables: dict[str, gpd.GeoDataFrame]) -> list[str]:
    """The first 5 digits of every town and tract GEOID match a county's
    CNTYGEOID."""
    counties = tables.get("vt_county_lines")
    if counties is None or "CNTYGEOID" not in counties.columns:
        return []  # validate() / check_schema report what is missing
    county_ids = set(counties["CNTYGEOID"].dropna().astype(str))
    problems = []

    for name in ("vt_town_lines", "vt_tract_lines"):
        df = tables.get(name)
        if df is None or "GEOID" not in df.columns:
            continue
        geoids = df["GEOID"].dropna().astype(str)
        orphans = geoids[~geoids.str[:5].isin(county_ids)]
        if not orphans.empty:
            problems.append(f"{name}: GEOID in unknown county: {_join(orphans)}")

    return problems


def validate(tables: dict[str, gpd.GeoDataFrame]) -> None:
    """Run every check on the tables `collect()` returns.

    Collects all problems instead of stopping at the first, then raises
    FipsValidationError once, listing every problem.
    """
    problems = []

    for name in EXPECTED_SCHEMAS:
        if name not in tables:
            problems.append(f"{name}: missing table")
            continue
        df = tables[name]
        problems += check_schema(name, df)
        problems += check_row_count(name, df)
        problems += check_ids(name, df)
        problems += check_geometry(name, df)

    if "vt_county_lines" in tables:
        problems += check_counties(tables["vt_county_lines"])
    problems += check_nesting(tables)

    if problems:
        raise FipsValidationError(
            f"{len(problems)} validation problem(s):\n  " + "\n  ".join(problems)
        )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _row_ids(name: str, df: pd.DataFrame) -> pd.Series:
    """Each row's ID, to name rows in messages. Falls back to the row number
    if the ID column is missing."""
    column_name, _ = ID_COLUMNS[name]
    if column_name in df.columns:
        return df[column_name].astype(str)
    return pd.Series(df.index.astype(str), index=df.index)


def _join(values: pd.Series) -> str:
    """Unique values, sorted and comma-separated, for a message."""
    return ", ".join(sorted(set(values.astype(str))))


def collect():
    tables = {
        "vt_county_lines": fetch_counties(),
        "vt_town_lines": fetch_towns(),
        "vt_tract_lines": fetch_tracts(),
    }
    validate(tables)
    return tables


def main():
    collect()


if __name__ == "__main__":
    main()
