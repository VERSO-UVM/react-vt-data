"""
**Author**:
    Isaac Wedaman
**Created**:
    2026-8-24
**Description**:
    Data cleaning script for the raw `parcels` table in the DuckLake.

    Standardizes TOWN/COUNTY naming and attaches the canonical Census/VCGI
    GEOID (via `lake.RAW.vt_town_lines`, the same crosswalk `clean_fips.py`
    builds `vt_town_lines` from) so parcels can be joined to other mapped
    layers (zoning, wastewater, flood hazard) for the buildable-areas layer.

    Hand-maintained lookup tables and column lists live in
    `parcels_constants.py`.
**Run with**:
    python -m data_cleaning.clean_parcels
"""

import duckdb
import pandas as pd

from data_cleaning.parcels_constants import (
    CAT_MAP,
    EQUIPCODE_MAP,
    EXPDESC_MAP,
    OOS_MAP,
    PURPOSE_MAP,
    RESCODE_MAP,
    STATES,
    STATUTE_MAP,
    TOWN_COUNTY_MAP,
    geom_cols,
    info_cols,
    tax_cols,
)

_STATES_SQL = ", ".join(f"'{s}'" for s in STATES)


def _register_map(
    con: duckdb.DuckDBPyConnection, view_name: str, mapping: dict
) -> None:
    df = pd.DataFrame(mapping.items(), columns=["key", "value"])
    con.register(view_name, df)


def build_lookup_maps(con: duckdb.DuckDBPyConnection) -> None:
    """
    Register the hand-maintained VCGI recode dictionaries as joinable
    lookup tables.
    """
    _register_map(con, "county_map", TOWN_COUNTY_MAP)
    _register_map(con, "rescode_map", RESCODE_MAP)
    _register_map(con, "cat_map", CAT_MAP)
    _register_map(con, "purpose_map", PURPOSE_MAP)
    _register_map(con, "statute_map", STATUTE_MAP)
    _register_map(con, "expdesc_map", EXPDESC_MAP)
    _register_map(con, "equipcode_map", EQUIPCODE_MAP)
    _register_map(con, "oos_map", OOS_MAP)


def build_town_geoid(con: duckdb.DuckDBPyConnection) -> None:
    """
    Build a TOWN -> GEOID crosswalk from the canonical Census/VCGI town
    boundary layer (lake.RAW.vt_town_lines, the same source clean_fips.py
    standardizes into vt_town_lines).

    TOWN_KEY is normalized to the all-caps town/city/gore/grant spelling
    used by the parcels TOWN column (suffix dropped unless it disambiguates
    or is part of the proper name), purely to drive the join below. `town`
    is the display value: the Census/ACS-style "{name} town/city/gore/grant"
    form (lowercase suffix, always present) straight from vt_town_lines.NAME.
    """
    con.execute(
        r"""--sql
        CREATE OR REPLACE TEMP VIEW town_geoid AS
        WITH parsed AS (
            SELECT DISTINCT
                GEOID,
                NAME,
                regexp_extract(NAME, '^(.*?)\s+(town|city|gore|grant),', 1) AS base,
                regexp_extract(NAME, '^(.*?)\s+(town|city|gore|grant),', 2) AS suffix
            FROM lake.RAW.vt_town_lines
        ),
        counted AS (
            SELECT *, COUNT(*) OVER (PARTITION BY base) AS base_count
            FROM parsed
        ),
        normalized AS (
            SELECT
                GEOID,
                TRIM(SPLIT_PART(NAME, ',', 1)) AS town,
                -- Only keep the town/city/gore/grant suffix where it disambiguates
                -- two entities sharing a base name (Barre, Newport, Rutland,
                -- Saint Albans) or where it's part of the proper name (gores/grants).
                REPLACE(
                    REPLACE(
                        UPPER(
                            CASE
                                WHEN suffix IN ('gore', 'grant') OR base_count > 1
                                    THEN base || ' ' || suffix
                                ELSE base
                            END
                        ),
                        'ST.', 'SAINT'
                    ),
                    '''', ''
                ) AS town_key
            FROM counted
        )
        SELECT
            GEOID,
            town,
            -- VT's official name for this gore omits the possessive that the
            -- Census/TIGER source uses ("Warren's Gore" -> parcels' "WARREN GORE").
            CASE WHEN town_key = 'WARRENS GORE' THEN 'WARREN GORE' ELSE town_key END
                AS TOWN_KEY
        FROM normalized
        """
    )


def build_parcels_full(con: duckdb.DuckDBPyConnection) -> None:
    con.execute(
        f"""--sql
        CREATE OR REPLACE TEMP VIEW parcels_full AS
        WITH state_norm AS (
            SELECT
                *,
                CASE
                    WHEN STGL ILIKE 'VT%' OR STGL ILIKE '05%'
                        OR STGL ILIKE '%VT%' OR STGL ILIKE '%V T%'
                        THEN 'VERMONT'
                    WHEN STGL ILIKE '%CANADA%' OR STGL ILIKE '%QC%'
                        THEN 'CANADA'
                    ELSE STGL
                END AS stgl_1
            FROM lake.RAW.parcels
        ),
        state_oos AS (
            SELECT s.*, COALESCE(oos_map.value, s.stgl_1) AS stgl_2
            FROM state_norm s
            LEFT JOIN oos_map ON s.stgl_1 = oos_map.key
        ),
        staged AS (
            SELECT
                *,
                CASE
                    WHEN stgl_2 IS NOT NULL
                        AND stgl_2 NOT IN ('CANADA', 'FOREIGN', 'US TERRITORY')
                        AND stgl_2 NOT IN ({_STATES_SQL})
                        THEN 'UNNAMED AMERICA'
                    ELSE stgl_2
                END AS stgl_final,
                ST_Area(
                    ST_Transform(ST_GeomFromWKB(geometry), 'EPSG:4326', 'EPSG:32145', true)
                ) / 4046.8564224 AS area_acres
            FROM state_oos
        )
        SELECT
            p.OBJECTID AS object_id,
            COALESCE(town_geoid.town, p.TOWN) AS town,
            county_map.value AS county,
            town_geoid.GEOID AS geoid,
            p.SPAN AS span_number,
            p.PROPTYPE AS property_type,
            p.CAT AS cat,
            cat_map.value AS category,
            purpose_map.value AS purpose,
            p.DESCPROP AS property_description,
            rescode_map.value AS resident_type,
            p.ACRESGL AS acres,
            p.area_acres AS area_acres_geom,
            p.CITYGL AS city,
            p.stgl_final AS state,
            p.ADDRGL1 AS address,
            p.OWNER1 AS owner_1,
            p.OWNER2 AS owner_2,
            CASE
                WHEN p.SOURCENAME IN ('CITY', 'TOWN', 'City of Burlington')
                    THEN 'LOCAL DEPARTMENT'
                ELSE 'NOT LOCAL DEPARTMENT'
            END AS source_name,
            p.MATCHSTAT AS match_stat,
            p.TNAME AS town_name,
            (
                p.CAT IN ('R1', 'R2', 'MHL', 'MHU')
                AND (p.HSDECL IS NULL OR p.HSDECL = 'N')
            ) AS investment_property,
            ((p.LAND_LV > 0) AND (COALESCE(p.IMPRV_LV, 0) = 0)) AS vacant_land,
            (COALESCE(p.stgl_final, 'VT') <> 'VT') AS out_of_state_owner,
            p.EDITOR AS editor,
            p.EDITDATE AS edit_date,
            p.REAL_FLV AS listed_real_value,
            p.HSTED_FLV AS homestead_listed_value,
            p.NRES_FLV AS non_residential_value,
            p.LAND_LV AS land_value,
            p.IMPRV_LV AS improvements_value,
            p.EQUIPVAL AS equipment_value,
            COALESCE(equipcode_map.value, 'NOT A UTILITY') AS equipment_code,
            p.INVENVAL AS inventory_value,
            p.HSDECL AS homestead_declared,
            p.VETEXAMT AS veterans_exemption_amount,
            COALESCE(expdesc_map.value, 'None') AS exemption_description,
            (CASE WHEN p.STATUTE IS NOT NULL THEN 'YES' ELSE 'NO' END) AS exempt,
            COALESCE(statute_map.value, 'No Exemption') AS statute,
            p.EXAMT_HS AS exemption_homestead_amount,
            p.EXAMT_NR AS exemption_nonresidential_amount,
            p.UVREDUC_HS AS current_use_homestead_reduction_amount,
            p.UVREDUC_NR AS current_use_nonresidential_reduction_amount,
            p.GLVAL_HS AS gl_value_homestead,
            p.GLVAL_NR AS gl_value_nonresidential,
            CASE
                WHEN p.REAL_FLV > 0 AND p.area_acres > 0
                    THEN p.REAL_FLV / p.area_acres
                ELSE NULL
            END AS value_per_acre,
            ST_Multi(ST_GeomFromWKB(p.geometry)) AS geometry
        FROM staged p
        LEFT JOIN county_map ON p.TOWN = county_map.key
        LEFT JOIN town_geoid ON p.TOWN = town_geoid.TOWN_KEY
        LEFT JOIN cat_map ON p.CAT = cat_map.key
        LEFT JOIN purpose_map ON p.CAT = purpose_map.key
        LEFT JOIN rescode_map ON p.RESCODE = rescode_map.key
        LEFT JOIN equipcode_map ON p.EQUIPCODE = equipcode_map.key
        LEFT JOIN expdesc_map ON p.EXPDESC = expdesc_map.key
        LEFT JOIN statute_map ON p.STATUTE = statute_map.key
        WHERE p.geometry IS NOT NULL
            AND NOT ST_IsEmpty(ST_GeomFromWKB(p.geometry))
        """
    )


def build_geom(con: duckdb.DuckDBPyConnection) -> None:
    con.execute(
        f"""--sql
        CREATE OR REPLACE TEMP VIEW geom AS
        SELECT {", ".join(geom_cols)}
        FROM parcels_full
        """
    )


def build_info(con: duckdb.DuckDBPyConnection) -> None:
    con.execute(
        f"""--sql
        CREATE OR REPLACE TEMP VIEW info AS
        SELECT {", ".join(info_cols)}
        FROM parcels_full
        """
    )


def build_tax(con: duckdb.DuckDBPyConnection) -> None:
    con.execute(
        f"""--sql
        CREATE OR REPLACE TEMP VIEW tax AS
        SELECT {", ".join(tax_cols)}
        FROM parcels_full
        """
    )


def clean(con: duckdb.DuckDBPyConnection) -> None:
    build_lookup_maps(con)
    build_town_geoid(con)
    build_parcels_full(con)
    build_geom(con)
    build_info(con)
    build_tax(con)


def add_to_lake(con: duckdb.DuckDBPyConnection) -> None:
    tables = ["geom", "info", "tax"]
    for name in tables:
        con.execute(
            f"""--sql
            CREATE OR REPLACE TABLE lake.CLEANED.VCGIParcels_{name} AS
            SELECT * FROM {name}
            """
        )
        # These are SQL-created TEMP VIEWs, not Python-registered relations,
        # so con.unregister() is a silent no-op here and leaves the view
        # behind in the shared connection — colliding with same-named views
        # (e.g. "info") that other cleaners in run_data_cleaning.py register
        # later on the same connection.
        con.execute(f"DROP VIEW IF EXISTS {name}")


def main(con: duckdb.DuckDBPyConnection) -> None:
    clean(con)
    add_to_lake(con)


if __name__ == "__main__":
    main()
