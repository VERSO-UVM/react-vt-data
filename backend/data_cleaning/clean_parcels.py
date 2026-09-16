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

    The TOWN -> COUNTY dict below (COUNTY_TOWNS) has been hand-verified
    against that same GEOID crosswalk: every VT town/city/gore/grant in the
    parcels dataset resolves to the correct county with zero mismatches.
**Run with**:
    python -m data_cleaning.clean_parcels
"""

import duckdb
import pandas as pd

geom_cols = ["OBJECTID", "GEOID", "TOWN", "COUNTY", "geometry"]
info_cols = [
    "OBJECTID",
    "GEOID",
    "TOWN",
    "COUNTY",
    "SPAN",
    "PROPTYPE",
    "CAT",
    "CATEGORY",
    "PURPOSE",
    "DESCPROP",
    "RESCODE",
    "ACRESGL",
    "AREAACRESGEOM",
    "CITYGL",
    "STGL",
    "ADDRESS",
    "SOURCENAME",
    "MATCHSTAT",
    "TNAME",
    "INVESTMENTPROP",
    "VACANTLAND",
    "OOSOWNER",
    "EDITOR",
    "EDITDATE",
]
tax_cols = [
    "OBJECTID",
    "GEOID",
    "TOWN",
    "REAL_FLV",
    "HSTED_FLV",
    "NRES_FLV",
    "LAND_LV",
    "IMPRV_LV",
    "EQUIPVAL",
    "EQUIPCODE",
    "INVENVAL",
    "HSDECL",
    "VETEXAMT",
    "EXPDESC",
    "STATUTE",
    "EXEMPT",
    "EXAMT_HS",
    "EXAMT_NR",
    "UVREDUC_HS",
    "UVREDUC_NR",
    "GLVAL_HS",
    "GLVAL_NR",
    "ACREVALUE",
]

STATUTE_MAP = {
    "3848:3849": "Business Inventory & Equipment",
    "3848:38:00": "Business Inventory & Equipment",
    "3840": "Charitable, Fraternal, or Rescue",
    "3840;5405a(a)(4)": "Charitable/Rescue (inc. Education Tax)",
    "3840;54": "Charitable/Rescue (inc. Education Tax)",
    "2741": "Tax Stabilization Contract",
    "24/2741": "Tax Stabilization Contract",
    "3832": "Public, Pious, or Charitable",
    "3832(1)": "Out-of-Town Municipal Property",
    "3832(7)": "Health or Recreational Property",
    "3832(7)(B)": "Non-profit Ice Skating Rink",
    "3832(7B": "Non-profit Ice Skating Rink",
    "5401": "Statewide Education Tax Exception",
    "3752(7)": "Agricultural / Current Use",
}

EXPDESC_MAP = {
    "Statutory": "State Law Exemption",
    "Solar Plant": "Solar Energy Facility",
    "Non-Approved (Voted)": "Local Town-Voted Exemption",
    "Qualified Housing Units": "Affordable / Qualified Housing",
    "Grandfathered": "Pre-existing Historical Exemption",
    "Partial-Statutory": "Partial State Law Exemption",
    "Municipal Contract (Owner Pays)": "Payment in Lieu of Taxes (PILOT)",
    "Ski Lifts / Snow Making Equip": "Ski Resort Equipment",
    "Court Ordered": "Judicially Mandated Exemption",
    "Wind Plant": "Wind Energy Facility",
}

RESCODE_MAP = {
    "T": "TOWN RESIDENT",
    "NS": "OUT OF STATE RESIDENT",
    "S": "VERMONT RESIDENT",
    "C": "CORPORATION/ENTITY",
    "c": "CORPORATION/ENTITY",
}

CAT_MAP = {
    "R1": "Residential I (Under 6 Acres)",
    "R2": "Residential II (6 Acres or More)",
    "M": "Miscellaneous",
    "O": "Other",
    "C": "Commercial",
    "MHL": "Mobile Home Landed (With Land)",
    "S1": "Seasonal I (Under 6 Acres)",
    "MHU": "Mobile Home Unlanded (Without Land)",
    "W": "Woodland",
    "S2": "Seasonal II (6 Acres or More)",
    "F": "Farm",
    "CA": "Commercial Apartments",
    "I": "Industrial",
    "UE": "Utility Electric",
    "UO": "Utility Other",
}

PURPOSE_MAP = {
    "R1": "PRIMARY RESIDENCE",
    "R2": "PRIMARY RESIDENCE",
    "MHL": "PRIMARY RESIDENCE",
    "MHU": "PRIMARY RESIDENCE",
    "S1": "SEASONAL PROPERTY",
    "S2": "SEASONAL PROPERTY",
    "W": "WOODLAND",
    "F": "FARM",
    "CA": "COMMERCIAL APARTMENTS",
    "M": "NOT LISTED",
    "O": "NOT LISTED",
    "C": "COMMERCIAL/INDUSTRIAL/UTILITY",
    "I": "COMMERCIAL/INDUSTRIAL/UTILITY",
    "UE": "COMMERCIAL/INDUSTRIAL/UTILITY",
    "UO": "COMMERCIAL/INDUSTRIAL/UTILITY",
}

EQUIPCODE_MAP = {"E": "ELECTRIC UTILITY", "C": "CABLE UTILITY"}

STATES = [
    "AL",
    "AK",
    "AZ",
    "AR",
    "CA",
    "CO",
    "CT",
    "DE",
    "FL",
    "GA",
    "HI",
    "ID",
    "IL",
    "IN",
    "IA",
    "KS",
    "KY",
    "LA",
    "ME",
    "MD",
    "MA",
    "MI",
    "MN",
    "MS",
    "MO",
    "MT",
    "NE",
    "NV",
    "NH",
    "NJ",
    "NM",
    "NY",
    "NC",
    "ND",
    "OH",
    "OK",
    "OR",
    "PA",
    "RI",
    "SC",
    "SD",
    "TN",
    "TX",
    "UT",
    "VA",
    "WA",
    "WV",
    "WI",
    "WY",
    "VT",
    "DC",
]

OOS_MAP = {"VERMONT": "VT"}
OOS_MAP.update(
    dict.fromkeys(
        ["QC", "QC CANADA", "PQ", "QUEBEC", "ON", "ONTARIO", "QUE", "BC", "ONT", "CAN"],
        "CANADA",
    )
)
OOS_MAP.update(dict.fromkeys(["MASS", "MA."], "MA"))
OOS_MAP.update(dict.fromkeys(["MICHIGAN"], "MI"))
OOS_MAP.update(dict.fromkeys(["OHIO"], "OH"))
OOS_MAP.update(dict.fromkeys(["CT."], "CT"))
OOS_MAP.update(dict.fromkeys(["R.I."], "RI"))
OOS_MAP.update(dict.fromkeys(["W VA"], "WV"))
OOS_MAP.update(dict.fromkeys(["MARYLAND"], "MD"))
OOS_MAP.update(dict.fromkeys(["N CAROLINA"], "NC"))
OOS_MAP.update(dict.fromkeys(["NEW YORK", "N.Y.", "12513", "N Y"], "NY"))
OOS_MAP.update(dict.fromkeys(["FLORIDA", "FLA"], "FL"))
OOS_MAP.update(
    dict.fromkeys(
        [
            "ENGLAND",
            "AE",
            "UNK",
            "BERMUDA",
            "UK",
            "VY",
            "FRANCE",
            "IND",
            "ARUBA",
            "GERMANY",
            "IRELAND",
            "SWITZERLAN",
            "QLD AUS",
            "LIN",
            "0R",
            "BERLIN",
            "AUSTRALIA",
            "NS",
            "FWI",
            "BAHAMAS",
        ],
        "FOREIGN",
    )
)
OOS_MAP.update(dict.fromkeys(["VI", "PR", "GUAM"], "US TERRITORY"))

# VCGI/Census county assignments for every VT town, city, gore, and grant
# that appears in the parcels TOWN column. Hand-verified against the
# canonical GEOID crosswalk in lake.RAW.vt_town_lines: 0 mismatches.
COUNTY_TOWNS = {
    "ADDISON": [
        "ADDISON",
        "BRIDPORT",
        "BRISTOL",
        "CORNWALL",
        "FERRISBURGH",
        "GOSHEN",
        "GRANVILLE",
        "HANCOCK",
        "LEICESTER",
        "LINCOLN",
        "MIDDLEBURY",
        "MONKTON",
        "NEW HAVEN",
        "ORWELL",
        "PANTON",
        "RIPTON",
        "SALISBURY",
        "SHOREHAM",
        "STARKSBORO",
        "WALTHAM",
        "WEYBRIDGE",
        "WHITING",
        "VERGENNES",
    ],
    "BENNINGTON": [
        "ARLINGTON",
        "BENNINGTON",
        "DORSET",
        "GLASTENBURY",
        "LANDGROVE",
        "MANCHESTER",
        "PERU",
        "POWNAL",
        "READSBORO",
        "RUPERT",
        "SANDGATE",
        "SEARSBURG",
        "SHAFTSBURY",
        "STAMFORD",
        "SUNDERLAND",
        "WINHALL",
        "WOODFORD",
    ],
    "CALEDONIA": [
        "BARNET",
        "BURKE",
        "DANVILLE",
        "GROTON",
        "HARDWICK",
        "KIRBY",
        "LYNDON",
        "NEWARK",
        "PEACHAM",
        "RYEGATE",
        "SAINT JOHNSBURY",
        "SHEFFIELD",
        "STANNARD",
        "SUTTON",
        "WALDEN",
        "WATERFORD",
        "WHEELOCK",
    ],
    "CHITTENDEN": [
        "BOLTON",
        "CHARLOTTE",
        "COLCHESTER",
        "ESSEX",
        "ESSEX JUNCTION",
        "HINESBURG",
        "HUNTINGTON",
        "JERICHO",
        "MILTON",
        "RICHMOND",
        "SAINT GEORGE",
        "SHELBURNE",
        "UNDERHILL",
        "WESTFORD",
        "WILLISTON",
        "BURLINGTON",
        "WINOOSKI",
        "BUELS GORE",
        "SOUTH BURLINGTON",
    ],
    "ESSEX": [
        "AVERILL",
        "BLOOMFIELD",
        "BRIGHTON",
        "BRUNSWICK",
        "CANAAN",
        "CONCORD",
        "EAST HAVEN",
        "FERDINAND",
        "GRANBY",
        "GUILDHALL",
        "LEMINGTON",
        "LEWIS",
        "LUNENBURG",
        "MAIDSTONE",
        "NORTON",
        "VICTORY",
        "AVERYS GORE",
        "WARNERS GRANT",
        "WARREN GORE",
    ],
    "FRANKLIN": [
        "BAKERSFIELD",
        "BERKSHIRE",
        "ENOSBURGH",
        "FAIRFAX",
        "FAIRFIELD",
        "FLETCHER",
        "FRANKLIN",
        "GEORGIA",
        "HIGHGATE",
        "MONTGOMERY",
        "RICHFORD",
        "SAINT ALBANS CITY",
        "SAINT ALBANS TOWN",
        "SHELDON",
        "SWANTON",
    ],
    "GRAND_ISLE": [
        "ALBURGH",
        "GRAND ISLE",
        "ISLE LA MOTTE",
        "NORTH HERO",
        "SOUTH HERO",
    ],
    "LAMOILLE": [
        "BELVIDERE",
        "CAMBRIDGE",
        "EDEN",
        "ELMORE",
        "HYDE PARK",
        "JOHNSON",
        "MORRISTOWN",
        "STOWE",
        "WATERVILLE",
        "WOLCOTT",
    ],
    "ORANGE": [
        "BRADFORD",
        "BRAINTREE",
        "BROOKFIELD",
        "CHELSEA",
        "CORINTH",
        "FAIRLEE",
        "NEWBURY",
        "ORANGE",
        "RANDOLPH",
        "STRAFFORD",
        "THETFORD",
        "TOPSHAM",
        "TUNBRIDGE",
        "VERSHIRE",
        "WASHINGTON",
        "WEST FAIRLEE",
        "WILLIAMSTOWN",
    ],
    "ORLEANS": [
        "ALBANY",
        "BARTON",
        "BROWNINGTON",
        "CHARLESTON",
        "COVENTRY",
        "CRAFTSBURY",
        "DERBY",
        "GLOVER",
        "GREENSBORO",
        "HOLLAND",
        "IRASBURG",
        "JAY",
        "LOWELL",
        "MORGAN",
        "NEWPORT CITY",
        "NEWPORT TOWN",
        "TROY",
        "WESTFIELD",
        "WESTMORE",
    ],
    "RUTLAND": [
        "BENSON",
        "BRANDON",
        "CASTLETON",
        "CHITTENDEN",
        "CLARENDON",
        "DANBY",
        "FAIR HAVEN",
        "HUBBARDTON",
        "IRA",
        "KILLINGTON",
        "MENDON",
        "MIDDLETOWN SPRINGS",
        "MOUNT HOLLY",
        "MOUNT TABOR",
        "PAWLET",
        "PITTSFIELD",
        "PITTSFORD",
        "POULTNEY",
        "PROCTOR",
        "RUTLAND TOWN",
        "RUTLAND CITY",
        "SHREWSBURY",
        "SUDBURY",
        "TINMOUTH",
        "WALLINGFORD",
        "WELLS",
        "WEST HAVEN",
        "WEST RUTLAND",
    ],
    "WASHINGTON": [
        "BARRE TOWN",
        "BERLIN",
        "CABOT",
        "CALAIS",
        "DUXBURY",
        "EAST MONTPELIER",
        "FAYSTON",
        "MARSHFIELD",
        "MIDDLESEX",
        "MORETOWN",
        "NORTHFIELD",
        "PLAINFIELD",
        "ROXBURY",
        "WAITSFIELD",
        "WARREN",
        "WATERBURY",
        "WOODBURY",
        "WORCESTER",
        "BARRE CITY",
        "MONTPELIER",
    ],
    "WINDHAM": [
        "ATHENS",
        "BRATTLEBORO",
        "BROOKLINE",
        "DOVER",
        "DUMMERSTON",
        "GRAFTON",
        "GUILFORD",
        "HALIFAX",
        "JAMAICA",
        "LONDONDERRY",
        "MARLBORO",
        "NEWFANE",
        "PUTNEY",
        "ROCKINGHAM",
        "SOMERSET",
        "STRATTON",
        "TOWNSHEND",
        "VERNON",
        "WARDSBORO",
        "WESTMINSTER",
        "WHITINGHAM",
        "WILMINGTON",
        "WINDHAM",
    ],
    "WINDSOR": [
        "ANDOVER",
        "BALTIMORE",
        "BARNARD",
        "BETHEL",
        "BRIDGEWATER",
        "CAVENDISH",
        "CHESTER",
        "HARTFORD",
        "HARTLAND",
        "LUDLOW",
        "NORWICH",
        "PLYMOUTH",
        "POMFRET",
        "READING",
        "ROCHESTER",
        "ROYALTON",
        "SHARON",
        "SPRINGFIELD",
        "STOCKBRIDGE",
        "WEATHERSFIELD",
        "WEST WINDSOR",
        "WESTON",
        "WINDSOR",
        "WOODSTOCK",
    ],
}

TOWN_COUNTY_MAP = {
    town: county.replace("_", " ")
    for county, towns in COUNTY_TOWNS.items()
    for town in towns
}

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
    standardizes into vt_town_lines), normalized to the all-caps
    town/city/gore/grant spelling used by the parcels TOWN column.
    """
    con.execute(
        r"""--sql
        CREATE OR REPLACE TEMP VIEW town_geoid AS
        WITH parsed AS (
            SELECT DISTINCT
                GEOID,
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
            p.OBJECTID,
            p.TOWN,
            county_map.value AS COUNTY,
            town_geoid.GEOID,
            p.SPAN,
            p.PROPTYPE,
            p.CAT,
            cat_map.value AS CATEGORY,
            purpose_map.value AS PURPOSE,
            p.DESCPROP,
            rescode_map.value AS RESCODE,
            p.ACRESGL,
            p.area_acres AS AREAACRESGEOM,
            p.CITYGL,
            p.stgl_final AS STGL,
            p.E911ADDR AS ADDRESS,
            CASE
                WHEN p.SOURCENAME IN ('CITY', 'TOWN', 'City of Burlington')
                    THEN 'LOCAL DEPARTMENT'
                ELSE 'NOT LOCAL DEPARTMENT'
            END AS SOURCENAME,
            p.MATCHSTAT,
            p.TNAME,
            (
                p.CAT IN ('R1', 'R2', 'MHL', 'MHU')
                AND (p.HSDECL IS NULL OR p.HSDECL = 'N')
            ) AS INVESTMENTPROP,
            ((p.LAND_LV > 0) AND (COALESCE(p.IMPRV_LV, 0) = 0)) AS VACANTLAND,
            (COALESCE(p.stgl_final, 'VT') <> 'VT') AS OOSOWNER,
            p.EDITOR,
            p.EDITDATE,
            p.REAL_FLV,
            p.HSTED_FLV,
            p.NRES_FLV,
            p.LAND_LV,
            p.IMPRV_LV,
            p.EQUIPVAL,
            COALESCE(equipcode_map.value, 'NOT A UTILITY') AS EQUIPCODE,
            p.INVENVAL,
            p.HSDECL,
            p.VETEXAMT,
            COALESCE(expdesc_map.value, 'None') AS EXPDESC,
            (CASE WHEN p.STATUTE IS NOT NULL THEN 'YES' ELSE 'NO' END) AS EXEMPT,
            COALESCE(statute_map.value, 'No Exemption') AS STATUTE,
            p.EXAMT_HS,
            p.EXAMT_NR,
            p.UVREDUC_HS,
            p.UVREDUC_NR,
            p.GLVAL_HS,
            p.GLVAL_NR,
            CASE
                WHEN p.REAL_FLV > 0 AND p.area_acres > 0
                    THEN p.REAL_FLV / p.area_acres
                ELSE NULL
            END AS ACREVALUE,
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


def main(con: duckdb.DuckDBPyConnection) -> None:
    clean(con)
    add_to_lake(con)


if __name__ == "__main__":
    main()
