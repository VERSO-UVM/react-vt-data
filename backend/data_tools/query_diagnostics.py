"""Small, bounded explanations for exact filters that match no observations."""


def quote(name):
    return '"' + name.replace('"', '""') + '"'


def filter_clause(field, values, data_type):
    """Identifiers must already be validated against the dataset schema/catalog."""
    placeholders = ",".join("?" for _ in values)
    if data_type.upper().startswith(("VARCHAR", "CHAR", "TEXT")):
        return (
            f"lower(trim({quote(field)})) IN ({placeholders})",
            [str(value).strip().lower() for value in values],
        )
    return f"{quote(field)} IN ({placeholders})", list(values)


def empty_filter_hints(conn, dataset, filters, column_types):
    hints = []
    for field, values in list(filters.items())[:5]:
        predicate, parameters = filter_clause(field, values, column_types[field])
        count = conn.execute(
            f"SELECT COUNT(*) FROM {quote(dataset.table)} WHERE {predicate}", parameters
        ).fetchone()[0]
        candidates = conn.execute(
            f"SELECT value FROM (SELECT DISTINCT trim(CAST({quote(field)} AS VARCHAR)) AS value "
            f"FROM {quote(dataset.table)} WHERE {quote(field)} IS NOT NULL) "
            "ORDER BY levenshtein(lower(value), ?), value LIMIT 5",
            [str(values[0]).strip().lower()],
        ).fetchall()
        hints.append(
            {
                "code": "filter_matches",
                "column": field,
                "requested_values": values,
                "matching_rows_alone": count,
                "suggested_values": [row[0] for row in candidates],
                "message": "Count applies to this filter alone. Suggested values are examples, not substitutions; the original query is unchanged.",
            }
        )
    if len(filters) > 5:
        hints.append(
            {
                "code": "diagnostics_limited",
                "message": "Showing the first five filter diagnostics. Use describe_dataset(value_column=...) to inspect others.",
            }
        )
    hints.append(
        {
            "code": "no_matching_rows",
            "message": "No rows match the complete set of constraints. Check available filter values, geography and exact-variable year coverage with describe_dataset/search_variables, or remove one constraint at a time.",
        }
    )
    return hints
