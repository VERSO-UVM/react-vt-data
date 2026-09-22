"""Check the build-produced schema in CI without requiring a live warehouse.

The snapshot comes from warehouse metadata, independently of the MCP catalog.
Only tests judge compatibility; collecting the snapshot never rejects drift.
"""

import copy
import dataclasses
import json
import re
from pathlib import Path

import duckdb
import pytest

import run_data_loading
from data_tools.catalog import DATASETS, get_dataset
from warehouse_schema import snapshot_schema, write_schema_snapshot

SNAPSHOT_PATH = Path(__file__).resolve().parents[1] / "Data" / "warehouse.schema.json"
NUMERIC_TYPE = re.compile(
    r"(?:U?(?:TINYINT|SMALLINT|INTEGER|BIGINT|HUGEINT)|FLOAT|REAL|DOUBLE|"
    r"DECIMAL\(\d+,\s*\d+\))"
)

# Known, deliberate gaps between the catalog and the warehouse. Anything not
# listed here must match exactly; test_contract_exceptions_still_apply keeps
# this list from going stale.
TEXT_MEASURES = {
    # DP profile values mix numbers, Census sentinels, and '(X)'.
    ("acs5_dp", "Value"),
    # Stored as text by the wastewater cleaner.
    ("wastewater_treatment_facilities", "DesignHydraulicCapacityInMGD"),
}
UNEXPOSED_COLUMNS = {
    "cdc_places_county": {"geolocation", "totalpop18plus", "totalpopulation"},
    "cdc_places_tract": {"totalpop18plus", "totalpopulation"},
    # Map-only geometry and display color.
    "flood_hazard": {"geometry", "rgba_color"},
}


def _declared_columns(dataset):
    identity = (
        dataset.year_column,
        dataset.name_column,
        dataset.geo_type_column,
        dataset.id_column,
    )
    return (
        set(dataset.filter_columns)
        | set(dataset.value_columns)
        | set(dataset.variable_columns)
        | {column for column in identity if column}
    )


def _contract_errors(dataset, snapshot):
    """Differences between a catalog dataset and its built warehouse table."""
    columns = snapshot["tables"].get(dataset.table)
    if columns is None:
        return [f"Missing table: {dataset.table}"]
    expected = _declared_columns(dataset)
    errors = []
    if missing := expected - columns.keys():
        errors.append(f"Missing catalog fields: {', '.join(sorted(missing))}")
    added = columns.keys() - expected - UNEXPOSED_COLUMNS.get(dataset.id, set())
    if added:
        errors.append(f"Unmapped warehouse fields: {', '.join(sorted(added))}")
    for name in sorted(dataset.value_columns.keys() & columns.keys()):
        if (dataset.id, name) in TEXT_MEASURES:
            continue
        if not NUMERIC_TYPE.fullmatch(columns[name]):
            errors.append(
                f"Numeric measure {name} has incompatible type {columns[name]}"
            )
    return errors


def _zoning_contract_errors(snapshot):
    return _contract_errors(get_dataset("zoning_bylaws"), snapshot)


@pytest.fixture
def built_schema():
    return json.loads(SNAPSHOT_PATH.read_text())


def test_zoning_catalog_matches_built_warehouse_schema(built_schema):
    assert built_schema["format_version"] == 1
    errors = _zoning_contract_errors(built_schema)
    assert not errors, (
        "Built warehouse and MCP zoning catalog disagree:\n"
        + "\n".join(errors)
        + "\nReview the source/schema change and update the catalog or cleaner. "
        "Rebuild and commit Data/warehouse.schema.json with the matching changes; "
        "do not hand-edit the snapshot to hide a mismatch."
    )


@pytest.mark.parametrize("change", ["added", "removed", "renamed", "type", "table"])
def test_contract_detects_source_schema_changes(built_schema, change):
    changed = copy.deepcopy(built_schema)
    columns = changed["tables"]["VersoZoning_wide"]
    if change == "added":
        columns["PRD_New_Standard"] = "DOUBLE"
    elif change == "removed":
        del columns["PRD_Max_Units"]
    elif change == "renamed":
        columns["PRD_Maximum_Units"] = columns.pop("PRD_Max_Units")
    elif change == "type":
        columns["PRD_Max_Units"] = "VARCHAR"
    else:
        del changed["tables"]["VersoZoning_wide"]
    errors = _zoning_contract_errors(changed)
    assert errors
    assert "PRD_" in " ".join(errors) or "Missing table" in errors[0]


@pytest.mark.parametrize("dataset_id", sorted(DATASETS))
def test_catalog_dataset_matches_built_warehouse_schema(built_schema, dataset_id):
    errors = _contract_errors(DATASETS[dataset_id], built_schema)
    assert not errors, (
        f"Built warehouse and MCP catalog disagree for {dataset_id}:\n"
        + "\n".join(errors)
        + "\nUpdate the catalog (data_tools/catalog.py) or the cleaner so they "
        "match, then rebuild and commit Data/warehouse.schema.json. Do not "
        "hand-edit the snapshot to hide a mismatch."
    )


def test_contract_exceptions_still_apply(built_schema):
    tables = built_schema["tables"]
    for dataset_id, column in TEXT_MEASURES:
        dataset = DATASETS[dataset_id]
        column_type = tables[dataset.table][column]
        assert column in dataset.value_columns
        assert not NUMERIC_TYPE.fullmatch(column_type), (
            f"{dataset_id}.{column} is now {column_type}; remove it from TEXT_MEASURES"
        )
    for dataset_id, unexposed in UNEXPOSED_COLUMNS.items():
        dataset = DATASETS[dataset_id]
        stale = unexposed - (tables[dataset.table].keys() - _declared_columns(dataset))
        assert not stale, (
            f"{dataset_id} no longer has unexposed {sorted(stale)}; "
            "remove them from UNEXPOSED_COLUMNS"
        )


# The housing cost burden table changed from one wide measure to a tidy table
# by tenure (#127). Either half of that change landing alone must fail.
OLD_BURDEN_COLUMNS = {
    "NAME": "VARCHAR",
    "geo_type": "VARCHAR",
    "pct_housing_burden": "DOUBLE",
    "year": "BIGINT",
}


def test_contract_catches_catalog_not_updated_for_new_table(built_schema):
    stale_catalog = dataclasses.replace(
        get_dataset("acs5_ts_income_burden"),
        kind="wide",
        variable_columns=(),
        value_columns={"pct_housing_burden": "percent"},
        filter_columns=("year", "NAME", "geo_type"),
    )
    errors = " ".join(_contract_errors(stale_catalog, built_schema))

    assert "Missing catalog fields: pct_housing_burden" in errors
    assert "Unmapped warehouse fields: Percent, Total, Value, Variable" in errors


def test_contract_catches_table_not_rebuilt_for_new_catalog(built_schema):
    stale_schema = copy.deepcopy(built_schema)
    table = get_dataset("acs5_ts_income_burden").table
    stale_schema["tables"][table] = dict(OLD_BURDEN_COLUMNS)
    errors = " ".join(
        _contract_errors(get_dataset("acs5_ts_income_burden"), stale_schema)
    )

    assert "Missing catalog fields: Percent, Total, Value, Variable" in errors
    assert "Unmapped warehouse fields: pct_housing_burden" in errors


def test_snapshot_is_metadata_only_and_ignores_attached_databases(tmp_path):
    with duckdb.connect(":memory:") as conn:
        conn.execute('CREATE TABLE "example table" ("value" DOUBLE, label VARCHAR)')
        conn.execute("ATTACH ':memory:' AS source")
        conn.execute("CREATE TABLE source.private_table (secret VARCHAR)")
        expected = {
            "format_version": 1,
            "tables": {"example table": {"value": "DOUBLE", "label": "VARCHAR"}},
        }
        assert snapshot_schema(conn) == expected
        path = write_schema_snapshot(conn, tmp_path / "warehouse.schema.json")
        before = path.read_bytes()
        conn.execute("INSERT INTO \"example table\" VALUES (1, 'not in snapshot')")
        write_schema_snapshot(conn, path)
        assert path.read_bytes() == before
        assert json.loads(before) == expected


def test_warehouse_build_records_incompatible_schema_without_rejecting_it(
    tmp_path, monkeypatch
):
    # A regular attached DuckDB stands in for DuckLake; no network extensions or
    # production data are needed to exercise the actual loading/export path.
    source = tmp_path / "source.duckdb"
    with duckdb.connect(str(source)) as conn:
        conn.execute("CREATE SCHEMA CLEANED")
        conn.execute(
            "CREATE TABLE CLEANED.VersoZoning_wide "
            "(PRD_Max_Units VARCHAR, PRD_New_Standard DOUBLE)"
        )
        conn.execute("INSERT INTO CLEANED.VersoZoning_wide VALUES ('By review', 7)")
    connect = duckdb.connect

    class LakeFixtureConnection:
        def __init__(self, path):
            self.conn = connect(path)

        def execute(self, sql, *args):
            if sql.lstrip().startswith("ATTACH"):
                sql = "ATTACH '" + str(source).replace("'", "''") + "' AS lake"
            return self.conn.execute(sql, *args)

        def close(self):
            self.conn.close()

    monkeypatch.setattr(run_data_loading, "DATA_DIR", tmp_path)
    monkeypatch.setattr(run_data_loading.duckdb, "connect", LakeFixtureConnection)
    monkeypatch.setattr(
        run_data_loading, "get_cleaned_tables", lambda conn: ["VersoZoning_wide"]
    )
    run_data_loading.create_duckdb()

    with connect(str(tmp_path / "warehouse.duckdb"), read_only=True) as conn:
        assert conn.execute("SELECT * FROM VersoZoning_wide").fetchall() == [
            ("By review", 7.0)
        ]
        recorded = json.loads((tmp_path / "warehouse.schema.json").read_text())
        assert recorded == snapshot_schema(conn)
    assert _zoning_contract_errors(recorded), "CI, rather than the build, rejects drift"
