/**
 * @description
 *   Client-side bounding-box crop, applied to every layer's fetch result as
 *   a correctness safety net on top of the (best-effort, name-based)
 *   server-side jurisdiction scoping. It matters most for layers with no
 *   server-side town filter at all (flood, which is GET-only) — without it,
 *   flood renders all ~500 statewide polygons regardless of the selected
 *   town, which reads as "wrong" once every other layer is town-scoped.
 *   Cheap: every dataset here is already small (hundreds to low thousands
 *   of features after jurisdiction scoping, ~500 for the unscoped flood
 *   layer), so a per-feature bbox test costs nothing noticeable.
 */

import type { FeatureCollection } from 'geojson';
import { getFeatureBBox } from './geoUtils';

type BBox = [number, number, number, number];

function bboxesOverlap(a: BBox, b: BBox): boolean {
  const [aMinX, aMinY, aMaxX, aMaxY] = a;
  const [bMinX, bMinY, bMaxX, bMaxY] = b;
  return !(aMaxX < bMinX || aMinX > bMaxX || aMaxY < bMinY || aMinY > bMaxY);
}

/** Keep only features whose bounding box overlaps the target bbox. A small
 *  margin is added since a town boundary and a dataset's own polygons
 *  (flood zones, service areas) legitimately straddle municipal lines. */
export function cropToBBox(
  fc: FeatureCollection,
  targetBBox: BBox | null,
  marginDegrees = 0.05,
): FeatureCollection {
  if (!targetBBox) return fc;
  const [w, s, e, n] = targetBBox;
  const padded: BBox = [
    w - marginDegrees,
    s - marginDegrees,
    e + marginDegrees,
    n + marginDegrees,
  ];

  return {
    ...fc,
    features: fc.features.filter((f) => {
      const bbox = getFeatureBBox(f.geometry);
      if (bbox[0] === 0 && bbox[1] === 0 && bbox[2] === 0 && bbox[3] === 0) {
        return true; // couldn't compute a bbox — don't silently drop it
      }
      return bboxesOverlap(bbox, padded);
    }),
  };
}
