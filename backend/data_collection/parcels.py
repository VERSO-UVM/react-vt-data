"""
**Author**:
    Isaac Wedaman
**Created**:
    2026-08-24
**Description**:
    fetches the parcel dataset
"""

import zipfile
from io import BytesIO
from pathlib import Path

import geopandas as gpd
import pandas as pd
import requests

# list of towns from which to gather data
VT_TOWNS = [
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

# base url from which to get the parcels
BASE_URL = BASE = (
    "https://maps.vcgi.vermont.gov/gisdata/vcgi/packaged_zips/CadastralParcels_VTPARCELS/"
)


# will figure this out later
STORAGE_LOCATION = "Data/parcels"

# ---------------------------------------------------------------------------
# VERMONT PARCELS API fetch
# ---------------------------------------------------------------------------


def fetch_town(town: str):
    # the destination is the backfill folder in the parcels folder, with one entrance per town
    destination = Path(f"{STORAGE_LOCATION}/backfill/{town}")
    # making a variable for the town's SHAPEFILE being there
    shp = destination / f"VTPARCELS_{town}.shp"
    # we can skip athe need to download if the file is already there - this will save time on multiple go arounds
    if shp.exists():
        return
    # getting the info from the api
    r = requests.get(f"{BASE_URL}VTPARCELS_{town}.zip", timeout=60)
    # throwing an exception if the https request fails
    r.raise_for_status()
    # extracting the data
    zipfile.ZipFile(BytesIO(r.content)).extractall(destination)


def standardize_town(shp_path: Path) -> gpd.GeoDataFrame:
    gdf = gpd.read_file(shp_path)
    gdf = gdf.to_crs(4326)
    gdf["TOWN"] = gdf["TOWN"].str.upper().str.strip()
    return gdf


# ---------------------------------------------------------------------------
# Main scrape runner
# ---------------------------------------------------------------------------


# need to add a failsafe - all towns might not work
def collect():
    # failed = []
    # trying each town
    # we collecdt each failure and add it to the failedd list, also citing it's failure essage
    for town in VT_TOWNS:
        fetch_town(town)

    gdfs = [
        standardize_town(
            Path(f"{STORAGE_LOCATION}/backfill/{town}") / f"VTPARCELS_{town}.shp"
        )
        for town in VT_TOWNS
    ]

    # concatenating what we just grabbed to backfill gpd
    backfill = pd.concat(gdfs, ignore_index=True)
    # changing the geometry
    backfill = gpd.GeoDataFrame(backfill, geometry="geometry", crs=4326)
    # contriving a stable join key
    backfill["OBJECTID"] = 1_000_000 + backfill.index
    # returning
    return backfill


# def combine(towns_list) -> gpd.GeoDataFrame:
#     # running the loop for each town in town list: we standardize the town after having grabbed it from sotrage
#     gdfs = [
#         standardize_town(
#             Path(f"{STORAGE_LOCATION}/backfill/{town}") / f"VTPARCELS_{town}.shp"
#         )
#         for town in towns_list
#     ]
#     # concatenating what we just grabbed to backfill gpd
#     backfill = pd.concat(gdfs, ignore_index=True)
#     # changing the geometry
#     backfill = gpd.GeoDataFrame(backfill, geometry="geometry", crs=4326)
#     # contriving a stable join key
#     backfill["OBJECTID"] = 1_000_000 + backfill.index
#     # returning
#     return backfill


if __name__ == "__main__":
    df = collect()
