"""Read-only zoning reconciliation without rewriting defective source identifiers.

Municipality names must identify one canonical subdivision before a source row can
be selected by location ID. A source geoid is evidence to report, never authority
to turn a city's district into its same-named town's district.
"""

from __future__ import annotations

import math
import re
import unicodedata
from collections import defaultdict
from typing import Any

from . import catalog

_TABLES = {"VersoZoning_info", "VersoZoning_wide"}
_PREVIEW_LIMIT = 20
_SUFFIXES = ("city", "town", "village", "gore", "grant")
_OVERLAY = "lower(trim(COALESCE(overlay_district, ''))) IN ('yes', 'y', 'true', '1')"
_METHOD = (
    "Counts and recorded acreage sums, not dissolved land area. Source overlay "
    "flags determine exclusions, including any source classification errors. "
    "Overlapping districts may double-count land. Canonical location selection "
    "uses unambiguous municipality names; raw geoid values are retained and "
    "missing or conflicting IDs are reported, not repaired."
)


def _key(value: Any) -> str:
    text = unicodedata.normalize("NFKC", str(value or "")).casefold().strip()
    # A conventional spelling alias, not a correction to the inventory.
    text = re.sub(r"\bst(?:\.|\s)+(?=[a-z])", "saint ", text)
    return "".join(character for character in text if character.isalnum())


def _county_key(value: Any) -> str:
    text = str(value or "").split(",")[0].strip()
    return _key(re.sub(r"\s+county$", "", text, flags=re.IGNORECASE))


def _geoid(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip().removesuffix(".0")
    return text or None


def _columns(conn, table: str) -> set[str]:
    if table not in _TABLES:
        raise ValueError("Unsupported zoning inventory table")
    return {row[0] for row in conn.execute(f'DESCRIBE "{table}"').fetchall()}


def _index(conn):
    places = [
        place
        for place in catalog.build_locations(conn)
        if place["geo_type"] == "county_subdivision"
    ]
    aliases: dict[str, dict[str, dict]] = defaultdict(dict)
    bases: dict[str, dict[str, dict]] = defaultdict(dict)
    for place in places:
        for alias in [place["name"], *place.get("aliases", [])]:
            aliases[_key(alias)][place["id"]] = place
        short = place["name"].split(",")[0]
        key = _key(short)
        aliases[key][place["id"]] = place
        for suffix in _SUFFIXES:
            if key.endswith(suffix):
                key = key[: -len(suffix)]
                break
        bases[key][place["id"]] = place
    return places, aliases, bases


def _candidates(value: Any, aliases, bases) -> list[dict]:
    key = _key(value)
    # A bare municipality name must consider both city and town even if an
    # existing alias happens to favor one of them.
    if key in bases:
        return list(bases[key].values())
    return list(aliases.get(key, {}).values())


def _county_name(value: str) -> str:
    return re.sub(r"\s+county$", "", value.split(",")[0].strip(), flags=re.IGNORECASE)


def _inventory(conn, table: str, *, county: str | None = None):
    columns = _columns(conn, table)
    if "town" not in columns:
        raise ValueError("The zoning inventory has no municipality-name field")
    geoid = '"geoid"' if "geoid" in columns else "NULL"
    county_column = '"county"' if "county" in columns else "NULL"
    if county and "county" not in columns:
        raise ValueError("The zoning inventory has no county field")
    condition = 'lower(trim("county")) = lower(?)' if county else "TRUE"
    parameters = [_county_name(county)] if county else []
    return conn.execute(
        f'SELECT "town", {geoid}, {county_column}, COUNT(*) '
        f'FROM "{table}" WHERE {condition} GROUP BY 1, 2, 3 ORDER BY 1, 2, 3',
        parameters,
    ).fetchall()


def _ambiguity(value, matches) -> ValueError:
    candidates = "; ".join(
        f"{place['name']} (location_id={place['id']})"
        for place in sorted(matches, key=lambda place: place["id"])[:10]
    )
    return ValueError(
        f"Ambiguous municipality {value!r}. Select an explicit city/town name or "
        f"location_id: {candidates}"
    )


def resolve_zoning_locations(
    conn,
    places: list[dict],
    *,
    table: str = "VersoZoning_info",
    county: str | None = None,
) -> tuple[str, list[Any], dict]:
    """Return parameterized name selection and source-ID reconciliation details.

    ``places`` must contain canonical records returned by ``build_locations``.
    The complete canonical index is consulted even when only one city or town is
    requested, so an ambiguous bare source name cannot silently match that place.
    """
    all_places, aliases, bases = _index(conn)
    known = {place["id"]: place for place in all_places}
    requested = {place["id"] for place in places}
    if any(place.get("geo_type") != "county_subdivision" for place in places):
        raise ValueError("Zoning location filters require county_subdivision IDs")
    if requested - set(known):
        raise ValueError("Unknown zoning location ID; use search_locations")
    mapping: dict[str, str] = {}
    matched = missing = mismatched = excluded_conflicts = unresolved_rows = 0
    unresolved: dict[str, int] = defaultdict(int)
    mismatch_preview = []
    mismatch_groups = 0
    for raw_name, raw_geoid, raw_county, count in _inventory(
        conn, table, county=county
    ):
        candidates = _candidates(raw_name, aliases, bases)
        if len(candidates) > 1 and raw_county:
            # County context can distinguish same-spelled towns, but never
            # city/town twins within one county.
            candidates = [
                place
                for place in candidates
                if _county_key(place.get("county_name")) == _county_key(raw_county)
            ]
        source_id = _geoid(raw_geoid)
        if len(candidates) != 1:
            unresolved_rows += count
            unresolved[str(raw_name or "")] += count
            if source_id in requested:
                excluded_conflicts += count
            continue
        canonical = candidates[0]
        if canonical["id"] not in requested:
            if source_id in requested:
                excluded_conflicts += count
            continue
        mapping[raw_name] = canonical["id"]
        matched += count
        if source_id is None:
            missing += count
        elif source_id != canonical["id"]:
            mismatched += count
        if source_id != canonical["id"]:
            mismatch_groups += 1
        if source_id != canonical["id"] and len(mismatch_preview) < _PREVIEW_LIMIT:
            mismatch_preview.append(
                {
                    "town": raw_name,
                    "source_geoid": raw_geoid,
                    "canonical_location_id": canonical["id"],
                    "district_count": count,
                }
            )
    names = sorted(mapping, key=str.casefold)
    clause = '"town" IN (' + ",".join("?" for _ in names) + ")" if names else "FALSE"
    parameters = list(names)
    if county:
        clause = f'({clause}) AND lower(trim("county")) = lower(?)'
        parameters.append(_county_name(county))
    diagnostics = {
        "strategy": "unambiguous canonical municipality name; raw geoid is retained",
        "inventory_county_scope": _county_name(county) if county else None,
        "scope_note": (
            "Matched/source-ID counts describe the canonical location selection within "
            "inventory_county_scope, before any additional query filters, overlay "
            "exclusions, projection, or pagination. Unresolved inventory counts cover "
            "all municipality names within that county scope, including unselected "
            "locations. A null county scope means the whole inventory. These are not "
            "counts of the returned page."
        ),
        "municipality_location_ids": mapping,
        "matched_district_count": matched,
        "missing_source_geoid_count": missing,
        "mismatched_source_geoid_count": mismatched,
        "conflicting_geoid_districts_excluded": excluded_conflicts,
        "source_geoid_issues_preview": mismatch_preview,
        "source_geoid_issues_preview_limit": _PREVIEW_LIMIT,
        "source_geoid_issues_group_count": mismatch_groups,
        "source_geoid_issues_preview_truncated": mismatch_groups > _PREVIEW_LIMIT,
        "inventory_unresolved_district_count": unresolved_rows,
        "inventory_unresolved_municipality_count": len(unresolved),
        "inventory_unresolved_names_preview": [
            {"town": name, "district_count": count}
            for name, count in sorted(unresolved.items())[:_PREVIEW_LIMIT]
        ],
        "inventory_unresolved_names_truncated": len(unresolved) > _PREVIEW_LIMIT,
    }
    return clause, parameters, diagnostics


def zoning_location_id(row: dict, diagnostics: dict) -> str | None:
    """Get the reconciled ID while leaving ``row['geoid']`` untouched."""
    return diagnostics.get("municipality_location_ids", {}).get(row.get("town"))


def _selection(conn, request):
    all_places, aliases, bases = _index(conn)
    known = {place["id"]: place for place in all_places}
    location_id = getattr(request, "location_id", None)
    municipality = getattr(request, "municipality", None)
    county = getattr(request, "county", None)
    if location_id and location_id not in known:
        raise ValueError("Unknown zoning location_id; use search_locations")
    matches = [known[location_id]] if location_id else []
    if municipality:
        named = _candidates(municipality, aliases, bases)
        if county:
            named = [
                place
                for place in named
                if _county_key(place.get("county_name")) == _county_key(county)
            ]
        if len(named) > 1:
            raise _ambiguity(municipality, named)
        if location_id and (not named or named[0]["id"] != location_id):
            raise ValueError("municipality and location_id identify different places")
        if named:
            matches = named
        elif not location_id:
            # Partial warehouses and non-subdivision village inventories can be
            # queried by an exact source name, without inventing a canonical ID.
            names = sorted(
                {
                    raw_name
                    for raw_name, _, raw_county, _ in _inventory(
                        conn, "VersoZoning_info"
                    )
                    if raw_name is not None
                    and _key(raw_name) == _key(municipality)
                    and (not county or _county_key(raw_county) == _county_key(county))
                }
            )
            clause = (
                '"town" IN (' + ",".join("?" for _ in names) + ")" if names else "FALSE"
            )
            return (
                clause,
                names,
                {
                    "strategy": "exact inventory municipality name; canonical location unresolved",
                    "municipality_location_ids": {},
                    "warning": "These source names are not verified canonical subdivisions. No geoid repair or interpretation was performed.",
                },
                [],
            )
    if matches:
        clause, params, diagnostics = resolve_zoning_locations(
            conn, matches, county=county
        )
    else:
        # Preserve all source rows for an unfiltered summary, including unresolved
        # names. The diagnostic index still identifies defects in that inventory.
        _, _, diagnostics = resolve_zoning_locations(conn, all_places, county=county)
        clause, params = "TRUE", []
    return clause, params, diagnostics, matches


def _number(value):
    if value is None:
        return None
    number = float(value)
    return number if math.isfinite(number) else None


def zoning_summary(conn, request, limit: int, offset: int = 0) -> dict:
    """Summarize one page and reconcile excluded overlays over its full selection."""
    columns = _columns(conn, "VersoZoning_info")
    required = {
        "county",
        "town",
        "district_type",
        "overlay_district",
        "acres",
    }
    if not required <= columns:
        raise ValueError("This warehouse lacks required zoning summary fields")
    if not 1 <= limit <= 1000 or not 0 <= offset < 2**63:
        raise ValueError("Invalid zoning summary pagination")
    clause, params, diagnostics, places = _selection(conn, request)
    if request.county:
        county = re.sub(
            r"\s+county$", "", request.county.split(",")[0].strip(), flags=re.IGNORECASE
        )
        clause += ' AND lower(trim("county")) = lower(?)'
        params = [*params, county]
    included = (
        clause if request.include_overlays else f"({clause}) AND NOT ({_OVERLAY})"
    )
    fields = [
        "county",
        "town",
        "district_type",
        "district_count",
        "recorded_acres",
        "districts_missing_acres",
    ]
    raw = conn.execute(
        "SELECT county, town, district_type, COUNT(*), SUM(acres), "
        'COUNT(*) FILTER (WHERE acres IS NULL) FROM "VersoZoning_info" '
        f"WHERE {included} GROUP BY county, town, district_type "
        "ORDER BY county, town, district_type LIMIT ? OFFSET ?",
        [*params, limit + 1, offset],
    ).fetchall()
    rows = [dict(zip(fields, row, strict=True)) for row in raw[:limit]]
    for row in rows:
        row["recorded_acres"] = _number(row["recorded_acres"])
    excluded = {
        "district_count": 0,
        "recorded_acres": 0.0,
        "districts_missing_acres": 0,
        "districts_preview": [],
        "preview_limit": _PREVIEW_LIMIT,
        "preview_truncated": False,
    }
    if not request.include_overlays:
        overlay_where = f"({clause}) AND ({_OVERLAY})"
        count, acres, missing = conn.execute(
            "SELECT COUNT(*), SUM(acres), COUNT(*) FILTER (WHERE acres IS NULL) "
            f'FROM "VersoZoning_info" WHERE {overlay_where}',
            params,
        ).fetchone()
        preview_fields = [
            name
            for name in (
                "object_id",
                "county",
                "town",
                "district_name",
                "district_type",
                "acres",
            )
            if name in columns
        ]
        preview = conn.execute(
            "SELECT "
            + ", ".join(f'"{field}"' for field in preview_fields)
            + f' FROM "VersoZoning_info" WHERE {overlay_where} ORDER BY '
            + ", ".join(f'"{field}"' for field in preview_fields)
            + " LIMIT ?",
            [*params, _PREVIEW_LIMIT],
        ).fetchall()
        preview_rows = [dict(zip(preview_fields, row, strict=True)) for row in preview]
        for row in preview_rows:
            row["acres"] = _number(row.get("acres"))
        excluded.update(
            district_count=count,
            recorded_acres=_number(acres) if count else 0.0,
            districts_missing_acres=missing,
            districts_preview=preview_rows,
            preview_truncated=count > _PREVIEW_LIMIT,
        )
    return {
        "dataset_id": "zoning_districts",
        "rows": rows,
        "columns": fields,
        "has_more": len(raw) > limit,
        "includes_overlays": request.include_overlays,
        "excluded_overlays": excluded,
        "location_diagnostics": diagnostics,
        "resolved_locations": [
            {"id": place["id"], "name": place["name"]} for place in places
        ],
        "units": {"recorded_acres": "acres", "district_count": "district records"},
        "methodology": _METHOD,
    }
