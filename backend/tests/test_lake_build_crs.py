"""
Tests that lake_build reprojects geometry to the lake's standard CRS before
encoding it as WKB.
"""

import geopandas as gpd
import pytest
from shapely import wkb
from shapely.geometry import Point

from lake_build import LAKE_CRS, geometry_to_wkb

# Burlington, VT in NAD83 (EPSG:4269), the CRS Census boundary files ship in
BURLINGTON = Point(-73.2121, 44.4759)


def test_reprojects_to_lake_crs():
    gdf = gpd.GeoDataFrame({"id": [1]}, geometry=[BURLINGTON], crs="EPSG:4269")

    out = geometry_to_wkb("RAW.test", gdf)
    point = wkb.loads(out["geometry"].iloc[0])

    expected = gdf.to_crs(LAKE_CRS).geometry.iloc[0]
    assert point.equals_exact(expected, tolerance=1e-9)
    # NAD83 and WGS84 differ by about a meter in Vermont, so still lon/lat
    assert point.x == pytest.approx(BURLINGTON.x, abs=1e-4)
    assert point.y == pytest.approx(BURLINGTON.y, abs=1e-4)


def test_projected_crs_becomes_lon_lat():
    # Vermont State Plane (meters) must come back as degrees
    gdf = gpd.GeoDataFrame({"id": [1]}, geometry=[BURLINGTON], crs="EPSG:4326").to_crs(
        "EPSG:32145"
    )

    point = wkb.loads(geometry_to_wkb("RAW.test", gdf)["geometry"].iloc[0])

    assert point.x == pytest.approx(BURLINGTON.x, abs=1e-6)
    assert point.y == pytest.approx(BURLINGTON.y, abs=1e-6)


def test_missing_crs_raises():
    gdf = gpd.GeoDataFrame({"id": [1]}, geometry=[BURLINGTON])

    with pytest.raises(ValueError, match="no CRS"):
        geometry_to_wkb("RAW.test", gdf)


def test_does_not_mutate_input():
    gdf = gpd.GeoDataFrame({"id": [1]}, geometry=[BURLINGTON], crs="EPSG:4269")

    geometry_to_wkb("RAW.test", gdf)

    assert gdf.crs == "EPSG:4269"
    assert gdf.geometry.iloc[0].equals(BURLINGTON)
