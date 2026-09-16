"""Stable result fields advertised to MCP clients; dataset rows remain extensible."""


def output_schema(name: str) -> dict:
    properties = {
        "warehouse_version": {
            "type": "string",
            "description": "Identity of the queried warehouse snapshot.",
        },
        "warehouse_modified_at": {
            "type": "string",
            "description": "Warehouse file modification time, not source publication date.",
        },
    }
    required = ["warehouse_version", "warehouse_modified_at"]
    arrays = {
        "list_datasets": "datasets",
        "search_variables": "variables",
        "search_locations": "locations",
    }
    if name in arrays:
        key = arrays[name]
        properties[key] = {"type": "array", "items": {"type": "object"}}
        required.append(key)
    elif name == "describe_dataset":
        properties.update(
            {
                "dataset_id": {"type": "string"},
                "available": {"type": "boolean"},
                "columns": {"type": "array", "items": {"type": "object"}},
                "source": {"type": "object"},
                "caveats": {"type": "array", "items": {"type": "string"}},
                "filter_values": {"type": "object"},
                "filter_values_by_column": {"type": "object"},
            }
        )
        required += ["dataset_id", "available", "columns", "source", "caveats"]
    else:
        properties.update(
            {
                "dataset_id": {"type": "string"},
                "columns": {"type": "array", "items": {"type": "string"}},
                "row_count": {"type": "integer", "minimum": 0},
                "has_more": {"type": "boolean"},
                "next_cursor": {"type": ["string", "null"]},
                "provenance": {"type": "object"},
                "coverage": {"type": "object"},
                "hints": {"type": "array", "items": {"type": "object"}},
                "warnings": {"type": "array", "items": {"type": "object"}},
                "location_diagnostics": {"type": "object"},
            }
        )
        required += [
            "dataset_id",
            "columns",
            "row_count",
            "has_more",
            "next_cursor",
            "provenance",
        ]
        if name == "export_data":
            properties.update(
                {
                    "csv": {"type": "string"},
                    "media_type": {"const": "text/csv"},
                    "filename": {"type": "string"},
                    "truncated": {"type": "boolean"},
                }
            )
            required += ["csv", "media_type", "filename", "truncated"]
        else:
            properties["rows"] = {"type": "array", "items": {"type": "object"}}
            required.append("rows")
        if name == "compare_places":
            properties["comparison_year"] = {"type": "integer"}
            required.append("comparison_year")
        if name == "get_zoning_summary":
            properties["excluded_overlays"] = {"type": "object"}
    return {
        "type": "object",
        "properties": properties,
        "required": required,
        "additionalProperties": True,
    }
