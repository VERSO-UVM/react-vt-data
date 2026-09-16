"""
**Author**:
    Isaac Wedaman
**Created**:
    2026-8-24
**Description**:
    Data cleaning script for the raw `parcels` table in the DuckLake
    Run with:
python -m ETL.data_cleaning.clean_parcels
"""

from pathlib import Path

import geopandas as gpd
import numpy as np
import pandas as pd
from datastore.lake_build import con
from shapely.geometry import MultiPolygon


## LOAD SPATIAL EXTENSION FUNCTION --------------------
def _load_spatial() -> None:
    """
    Load the spatial extension, installing it first if necessary.
    """
    try:
        con.execute("""--sql LOAD spatial""")
    except Exception:
        con.execute("""--sql INSTALL spatial""")
        con.execute("""--sql LOAD spatial""")


def make_tables(parcels):
    out = Path("Data/parcels/tables")
    out.mkdir(parents=True, exist_ok=True)

    def present(cols):
        return [c for c in cols if c in parcels.columns]

    geom_cols = present(["OBJECTID", "TOWN", "COUNTY", "geometry"])
    info_cols = present(
        [
            "OBJECTID",
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
            "data_origin",
            "EDITOR",
            "EDITDATE",
        ]
    )
    tax_cols = present(
        [
            "OBJECTID",
            "TOWN",
            "REAL_FLV",
            "HSTED_FLV",
            "NRES_FLV",
            "LAND_LV",
            "IMPRV_LV",
            "IMPR_SHARE",
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
        ]
    )

    geom = parcels[geom_cols].copy()
    info = parcels[info_cols].copy()
    tax = parcels[tax_cols].copy()

    geom.to_parquet(out / "parcels_geom.parquet")
    info.to_parquet(out / "parcels_info.parquet")
    tax.to_parquet(out / "parcels_tax.parquet")
    # edit this for later - where should I store them
    g = gpd.read_parquet(out / "parcels_geom.parquet")
    i = pd.read_parquet(out / "parcels_info.parquet")
    t = pd.read_parquet(out / "parcels_tax.parquet")


def register_parcels(gdf):
    df = pd.DataFrame(
        gdf.to_crs(4326).assign(geometry=gdf.to_crs(4326).geometry.to_wkb())
    )
    con.register("parcels_raw", df)
    # returning the gdf for the make tables


def build_parcels():
    con.execute("""--sql
            CREATE OR REPLACE VIEW parcels AS
            SELECT ST_GeomFromWKB(geometry) AS geometry, OBJECTID, TOWN, COUNTY, SPAN, PROPTYPE, CAT, CATEGORY, PURPOSE, DESCPROP, RESCODE, ACRESGL, AREAACRESGEOM, CITYGL, STGL, ADDRESS, SOURCENAME, MATCHSTAT, TNAME, INVESTMENTPROP, VACANTLAND, OOSOWNER, data_origin, EDITOR, EDITDATE, REAL_FLV, HSTED_FLV, NRES_FLV, LAND_LV, IMPRV_LV, IMPR_SHARE, EQUIPVAL, EQUIPCODE, INVENVAL, HSDECL, VETEXAMT, EXPDESC, STATUTE, EXEMPT, EXAMT_HS, EXAMT_NR, UVREDUC_HS, UVREDUC_NR, GLVAL_HS, GLVAL_NR
            FROM parcels_raw
        """)


def add_to_lake():
    con.execute(
        """--sql
        CREATE OR REPLACE TABLE lake.CLEANED.cleaned_geom AS
        SELECT *
        FROM geom
        """
    )
    con.execute(
        """--sql
            CREATE OR REPLACE TABLE lake.CLEANED.cleaned_info AS
            SELECT *
            FROM info
            """
    )
    con.execute(
        """--sql
            CREATE OR REPLACE TABLE lake.CLEANED.cleaned_tax AS
            SELECT *
            FROM tax
            """
    )


def clean():
    _load_spatial()
    gdf = load_helper_and_clean()
    register_parcels(gdf)
    build_parcels()
    return gdf


def main():
    make_tables(clean())
    add_to_lake()


def load_helper_and_clean(backfill):
    vermont_towns_from_parcels = [
        "Addison",
        "Albany",
        "Alburgh",
        "Andover",
        "Arlington",
        "Athens",
        "Averill",
        "Averys Gore",
        "Bakersfield",
        "Baltimore",
        "Barnard",
        "Barnet",
        "Barre City",
        "Barre Town",
        "Barton",
        "Belvidere",
        "Bennington",
        "Benson",
        "Berkshire",
        "Berlin",
        "Bethel",
        "Bloomfield",
        "Bolton",
        "Bradford",
        "Braintree",
        "Brandon",
        "Brattleboro",
        "Bridgewater",
        "Bridport",
        "Brighton",
        "Bristol",
        "Brookfield",
        "Brookline",
        "Brownington",
        "Brunswick",
        "Buels Gore",
        "Burke",
        "Burlington",
        "Cabot",
        "Calais",
        "Cambridge",
        "Canaan",
        "Castleton",
        "Cavendish",
        "Charleston",
        "Charlotte",
        "Chelsea",
        "Chester",
        "Chittenden",
        "Clarendon",
        "Colchester",
        "Concord",
        "Corinth",
        "Cornwall",
        "Coventry",
        "Craftsbury",
        "Danby",
        "Danville",
        "Derby",
        "Dorset",
        "Dover",
        "Dummerston",
        "Duxbury",
        "East Haven",
        "East Montpelier",
        "Eden",
        "Elmore",
        "Enosburgh",
        "Essex Junction",
        "Essex",
        "Fair Haven",
        "Fairfax",
        "Fairfield",
        "Fairlee",
        "Fayston",
        "Ferdinand",
        "Ferrisburgh",
        "Fletcher",
        "Franklin",
        "Georgia",
        "Glastenbury",
        "Glover",
        "Goshen",
        "Grafton",
        "Granby",
        "Grand Isle",
        "Granville",
        "Greensboro",
        "Groton",
        "Guildhall",
        "Guilford",
        "Halifax",
        "Hancock",
        "Hardwick",
        "Hartford",
        "Hartland",
        "Highgate",
        "Hinesburg",
        "Holland",
        "Hubbardton",
        "Huntington",
        "Hyde Park",
        "Ira",
        "Irasburg",
        "Isle La Motte",
        "Jamaica",
        "Jay",
        "Jericho",
        "Johnson",
        "Killington",
        "Kirby",
        "Landgrove",
        "Leicester",
        "Lemington",
        "Lewis",
        "Lincoln",
        "Londonderry",
        "Lowell",
        "Ludlow",
        "Lunenburg",
        "Lyndon",
        "Maidstone",
        "Manchester",
        "Marlboro",
        "Marshfield",
        "Mendon",
        "Middlebury",
        "Middlesex",
        "Middletown Springs",
        "Milton",
        "Monkton",
        "Montgomery",
        "Montpelier",
        "Moretown",
        "Morgan",
        "Morristown",
        "Mount Holly",
        "Mount Tabor",
        "New Haven",
        "Newark",
        "Newbury",
        "Newfane",
        "Newport City",
        "Newport Town",
        "North Hero",
        "Northfield",
        "Norton",
        "Norwich",
        "Orange",
        "Orwell",
        "Panton",
        "Pawlet",
        "Peacham",
        "Peru",
        "Pittsfield",
        "Pittsford",
        "Plainfield",
        "Plymouth",
        "Pomfret",
        "Poultney",
        "Pownal",
        "Proctor",
        "Putney",
        "Randolph",
        "Reading",
        "Readsboro",
        "Richford",
        "Richmond",
        "Ripton",
        "Rochester",
        "Rockingham",
        "Roxbury",
        "Royalton",
        "Rupert",
        "Rutland City",
        "Rutland Town",
        "Ryegate",
        "Saint Albans City",
        "Saint Albans Town",
        "Saint George",
        "Saint Johnsbury",
        "Salisbury",
        "Sandgate",
        "Searsburg",
        "Shaftsbury",
        "Sharon",
        "Sheffield",
        "Shelburne",
        "Sheldon",
        "Shoreham",
        "Shrewsbury",
        "Somerset",
        "South Burlington",
        "South Hero",
        "Springfield",
        "Stamford",
        "Stannard",
        "Starksboro",
        "Stockbridge",
        "Stowe",
        "Strafford",
        "Stratton",
        "Sudbury",
        "Sunderland",
        "Sutton",
        "Swanton",
        "Thetford",
        "Tinmouth",
        "Topsham",
        "Townshend",
        "Troy",
        "Tunbridge",
        "Underhill",
        "Vergennes",
        "Vernon",
        "Vershire",
        "Victory",
        "Waitsfield",
        "Walden",
        "Wallingford",
        "Waltham",
        "Wardsboro",
        "Warners Grant",
        "Warren Gore",
        "Warren",
        "Washington",
        "Waterbury",
        "Waterford",
        "Waterville",
        "Weathersfield",
        "Wells",
        "West Fairlee",
        "West Haven",
        "West Rutland",
        "West Windsor",
        "Westfield",
        "Westford",
        "Westminster",
        "Westmore",
        "Weston",
        "Weybridge",
        "Wheelock",
        "Whiting",
        "Whitingham",
        "Williamstown",
        "Williston",
        "Wilmington",
        "Windham",
        "Windsor",
        "Winhall",
        "Winooski",
        "Wolcott",
        "Woodbury",
        "Woodford",
        "Woodstock",
        "Worcester",
    ]

    ADDISON = [
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
    ]
    BENNINGTON = [
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
    ]
    CALEDONIA = [
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
    ]
    CHITTENDEN = [
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
    ]
    ESSEX = [
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
    ]
    FRANKLIN = [
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
    ]
    GRAND_ISLE = ["ALBURGH", "GRAND ISLE", "ISLE LA MOTTE", "NORTH HERO", "SOUTH HERO"]
    LAMOILLE = [
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
    ]
    ORANGE = [
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
    ]
    ORLEANS = [
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
    ]
    RUTLAND = [
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
    ]
    WASHINGTON = [
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
    ]
    WINDHAM = [
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
    ]
    WINDSOR = [
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
    ]
    counties_key = [
        ADDISON,
        BENNINGTON,
        CALEDONIA,
        CHITTENDEN,
        ESSEX,
        FRANKLIN,
        GRAND_ISLE,
        LAMOILLE,
        ORANGE,
        ORLEANS,
        RUTLAND,
        WASHINGTON,
        WINDHAM,
        WINDSOR,
    ]
    names_key = [
        "ADDISON",
        "BENNINGTON",
        "CALEDONIA",
        "CHITTENDEN",
        "ESSEX",
        "FRANKLIN",
        "GRAND_ISLE",
        "LAMOILLE",
        "ORANGE",
        "ORLEANS",
        "RUTLAND",
        "WASHINGTON",
        "WINDHAM",
        "WINDSOR",
    ]

    statutes_dict = {
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

    expdesc_dict = {
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

    rescode_dict = {
        "T": "TOWN RESIDENT",
        "NS": "OUT OF STATE RESIDENT",
        "S": "VERMONT RESIDENT",
        "C": "CORPORATION/ENTITY",
        "c": "CORPORATION/ENTITY",
    }

    cat_dict = {
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

    purpose_dict = {
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

    states = [
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

    oos_dict = {
        "VERMONT": "VT",
    }
    oos_dict.update(
        dict.fromkeys(
            [
                "QC",
                "QC CANADA",
                "PQ",
                "QUEBEC",
                "ON",
                "ONTARIO",
                "QUE",
                "BC",
                "ONT",
                "CAN",
            ],
            "CANADA",
        )
    )
    oos_dict.update(dict.fromkeys(["MASS", "MA."], "MA"))
    oos_dict.update(dict.fromkeys(["MICHIGAN"], "MI"))
    oos_dict.update(dict.fromkeys(["OHIO"], "OH"))
    oos_dict.update(dict.fromkeys(["CT."], "CT"))
    oos_dict.update(dict.fromkeys(["R.I."], "RI"))
    oos_dict.update(dict.fromkeys(["W VA"], "WV"))
    oos_dict.update(dict.fromkeys(["MARYLAND"], "MD"))
    oos_dict.update(dict.fromkeys(["N CAROLINA"], "NC"))
    oos_dict.update(dict.fromkeys(["NEW YORK", "N.Y.", "12513", "N Y"], "NY"))
    oos_dict.update(dict.fromkeys(["FLORIDA", "FLA"], "FL"))
    oos_dict.update(
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
    oos_dict.update(dict.fromkeys(["VI", "PR", "GUAM"], "US TERRITORY"))

    counties_dict = {}
    unknown = []
    for town in backfill["TOWN"].unique():
        for item in counties_key:
            if town in item:
                counties_dict[town] = names_key[(counties_key.index(item))]
    # adding in sourcename as city and town
    city_town_dict = {}

    city_source = backfill[
        (backfill["SOURCENAME"] == "CITY") | (backfill["SOURCENAME"] == "TOWN")
    ]

    # finding if the parcel was found from a local department or not
    backfill["SOURCENAME"] = np.where(
        backfill["SOURCENAME"].isin(["CITY", "TOWN", "City of Burlington"]),
        "LOCAL DEPARTMENT",
        "NOT LOCAL DEPARTMENT",
    )

    # this code aids in the creation of a column that sees if the primary people live there, or if it is an investment property.
    residential_codes = ["R1", "R2", "MHL", "MHU"]

    is_residential = backfill["CAT"].isin(residential_codes)
    is_not_homestead = backfill["HSDECL"].isna() | (backfill["HSDECL"] == "N")

    vt_mask = (
        backfill["STGL"].str.startswith("VT", na=False)
        | backfill["STGL"].str.startswith("Vt", na=False)
        | backfill["STGL"].str.startswith("05", na=False)
        | backfill["STGL"].str.contains("VT", na=False)
        | backfill["STGL"].str.contains("V T", na=False)
        | backfill["STGL"].str.startswith("vt", na=False)
    )
    backfill.loc[vt_mask, "STGL"] = "VERMONT"
    canada_mask = (
        backfill["STGL"].str.contains("CANADA", na=False)
        | backfill["STGL"].str.contains("Canada", na=False)
        | backfill["STGL"].str.contains("QC", na=False)
    )
    backfill.loc[canada_mask, "STGL"] = "CANADA"

    # mapping new items in columns
    backfill["INVESTMENTPROP"] = is_residential & is_not_homestead

    backfill["VACANTLAND"] = (backfill["LAND_LV"] > 0) & (
        backfill["IMPRV_LV"].fillna(0) == 0
    )
    equipcode_dict = {"E": "ELECTRIC UTILITY", "C": "CABLE UTILITY"}
    backfill["EXEMPT"] = backfill["STATUTE"].notna().map({True: "YES", False: "NO"})
    backfill["STATUTE"] = backfill["STATUTE"].map(statutes_dict).fillna("No Exemption")
    backfill["EXPDESC"] = backfill["EXPDESC"].map(expdesc_dict).fillna("None")
    backfill["EQUIPCODE"] = (
        backfill["EQUIPCODE"].map(equipcode_dict).fillna("NOT A UTILITY")
    )
    # creating a foreign ownerpship column

    backfill["COUNTY"] = backfill["TOWN"].map(counties_dict)
    backfill["RESCODE"] = backfill["RESCODE"].map(rescode_dict)
    backfill["CATEGORY"] = backfill["CAT"].map(cat_dict)
    backfill["PURPOSE"] = backfill["CAT"].map(purpose_dict)
    # adding state abbreivaitions and owner lcoations
    backfill["STGL"] = backfill["STGL"].replace(oos_dict)
    catch_all_mask = (
        ~backfill["STGL"].isin(["CANADA", "FOREIGN", "US TERRITORY"])
        & backfill["STGL"].notna()
        & ~backfill["STGL"].isin(states)
    )
    backfill.loc[catch_all_mask, "STGL"] = "UNNAMED AMERICA"
    backfill["OOSOWNER"] = backfill["STGL"].fillna("VT") != "VT"

    backfill["ADDRESS"] = backfill["E911ADDR"]

    # adding an area in acres to geometry column, a
    if "AREAACRESGEOM" not in backfill:
        backfill["AREAACRESGEOM"] = backfill.to_crs(32145).geometry.area / 4046.8564224
    backfill["ACREVALUE"] = np.where(
        (backfill.REAL_FLV > 0) & (backfill.AREAACRESGEOM > 0),
        backfill.REAL_FLV / backfill.AREAACRESGEOM,
        np.nan,
    )

    residential_codes = ["R1", "R2", "MH"]
    is_residential = backfill["PROPTYPE"].isin(residential_codes)
    is_not_homestead = backfill["HSDECL"].isna() | (backfill["HSDECL"] == "0")

    backfill = backfill.drop(
        columns=[
            "LOCAPROP",
            "ADDRGL2",
            "ENDDATE",
            "OWNER1",
            "OWNER2",
            "EDITNOTE",
            "MAPID",
            "YEAR",
            "GLYEAR",
            "SOURCETYPE",
            "SOURCEDATE",
            "EDITMETHOD",
            "SHAPE_STAr",
            "SHAPE_STLe",
            "GLIST_SPAN",
            "PARCID",
            "CRHOUSPCT",
            "MUNGL1PCT",
            "AOEGL_HS",
            "AOEGL_NR",
            "HSITEVAL",
            "E911ADDR",
            "ADDRGL1",
            "ZIPGL",
        ]
    )

    bad_geom = backfill.geometry.isna() | backfill.geometry.is_empty
    gdf = backfill.loc[~bad_geom].copy()

    assert gdf.geom_type.isin(["Polygon", "MultiPolygon"]).all(), (
        gdf.geom_type.value_counts()
    )
    gdf["geometry"] = gdf.geometry.apply(
        lambda g: MultiPolygon([g]) if g.geom_type == "Polygon" else g
    )
    return gdf


if __name__ == "__main__":
    main()
