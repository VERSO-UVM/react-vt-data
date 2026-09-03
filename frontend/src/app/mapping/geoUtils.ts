import type { Geometry } from 'geojson';

export function getFeatureBBox(
  geometry: Geometry | null | undefined,
): [number, number, number, number] {
  if (!geometry) return [0, 0, 0, 0];

  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  const processCoords = (coords: any) => {
    if (!Array.isArray(coords) || coords.length === 0) return;

    // Check if we reached a coordinate pair [lng, lat]
    if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
      const [lng, lat] = coords;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    } else {
      for (const child of coords) {
        processCoords(child);
      }
    }
  };

  if (geometry.type === 'GeometryCollection') {
    for (const geom of geometry.geometries) {
      if ('coordinates' in geom) processCoords(geom.coordinates);
    }
  } else if ('coordinates' in geometry) {
    processCoords(geometry.coordinates);
  }

  if (minLng === Infinity || minLat === Infinity) {
    return [0, 0, 0, 0];
  }

  return [minLng, minLat, maxLng, maxLat];
}
