"""Export warehouse column metadata without validating or reading table data."""

from __future__ import annotations

import argparse
import json
import os
import tempfile
from pathlib import Path
from typing import Any

import duckdb


def snapshot_schema(conn: duckdb.DuckDBPyConnection) -> dict[str, Any]:
    """Describe only the current database's main schema in stable name order."""
    rows = conn.execute(
        "SELECT table_name, column_name, data_type "
        "FROM information_schema.columns "
        "WHERE table_catalog = current_database() AND table_schema = 'main' "
        "ORDER BY table_name, column_name"
    ).fetchall()
    tables: dict[str, dict[str, str]] = {}
    for table, column, sql_type in rows:
        tables.setdefault(table, {})[column] = sql_type
    return {"format_version": 1, "tables": tables}


def write_schema_snapshot(conn: duckdb.DuckDBPyConnection, path: str | Path) -> Path:
    """Atomically replace a JSON snapshot; remove temporary files on failure."""
    snapshot = snapshot_schema(conn)
    destination = Path(path)
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w",
            encoding="utf-8",
            dir=destination.parent,
            prefix=f".{destination.name}.",
            suffix=".tmp",
            delete=False,
        ) as stream:
            temporary = Path(stream.name)
            json.dump(snapshot, stream, indent=2, sort_keys=True, ensure_ascii=False)
            stream.write("\n")
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, destination)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)
    return destination


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--warehouse", required=True, type=Path)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    if not args.warehouse.is_file():
        parser.error(f"Warehouse does not exist: {args.warehouse}")
    output = args.output or args.warehouse.parent / "warehouse.schema.json"
    if output.resolve() == args.warehouse.resolve():
        parser.error("The schema output must not overwrite the warehouse")
    with duckdb.connect(str(args.warehouse), read_only=True) as conn:
        written = write_schema_snapshot(conn, output)
    print(f"Warehouse schema snapshot: {written}")


if __name__ == "__main__":
    main()
