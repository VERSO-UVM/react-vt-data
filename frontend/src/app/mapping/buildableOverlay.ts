/**
 * @description
 *   Computes the actual "buildable" shape for the Buildable Areas preset:
 *   Permitted zoning allowances, intersected with well/moderately suited soil,
 *   minus flood hazard areas.
 *
 *   WHAT COUNTS AS BUILDABLE — this file only owns the geometry (the soil-
 *   suited ∩ zoning-permitted ∩ outside-flood combination, plus the
 *   District Name "conservation" exclusion below, which needs a text-pattern
 *   check the generic IN-list filter compiler can't express). The zoning
 *   Allowance/District Type criteria and the soil suitability levels that
 *   feed in here are set server-side by the preset's filters — see
 *   BUILDABLE_AREAS_DEFINITION and the "buildable-areas" preset in
 *   MapPresets.ts, which is the prose+filters source of truth this
 *   computation implements. Keep the two in sync.
 *
 *   Dissolve-then-combine: union each input layer into one shape, then
 *   intersect/difference those shapes — a handful of boolean ops on already
 *   town-scoped data (a few hundred features at most), not a per-feature
 *   pairwise sweep. Verified on real data at ~400-500ms end to end.
 */

import { union } from '@turf/union';
import { intersect } from '@turf/intersect';
import { difference } from '@turf/difference';
import { area } from '@turf/area';
import type {
  Feature,
  FeatureCollection,
  Polygon,
  MultiPolygon,
} from 'geojson';

const ACRES_PER_SQM = 1 / 4046.8564224;
export const BUILDABLE_COLOR: [number, number, number, number] = [
  34, 139, 34, 180,
];

type PolyFeature = Feature<Polygon | MultiPolygon>;
type PolyFC = FeatureCollection<Polygon | MultiPolygon>;

function asPolygonFC(fc: FeatureCollection | null | undefined): PolyFC | null {
  if (!fc?.features?.length) return null;
  const polys = fc.features.filter(
    (f): f is PolyFeature =>
      f.geometry?.type === 'Polygon' || f.geometry?.type === 'MultiPolygon',
  );
  return polys.length > 0
    ? { type: 'FeatureCollection', features: polys }
    : null;
}

/** Turf's own `featureCollection()` helper resolves, in this project, to a
 *  stray older `@turf/helpers` hoisted at the top level — its looser
 *  FeatureCollection type doesn't structurally match what union/intersect/
 *  difference (pulled in via @turf/turf) expect. Building the literal here
 *  sidesteps that version conflict entirely. */
function pairFC(a: PolyFeature, b: PolyFeature): PolyFC {
  return { type: 'FeatureCollection', features: [a, b] };
}

/** "Conservation" districts (Forest Conservation District, Resource
 *  Conservation Overlay, ...) show up across every District Type, including
 *  ones tagged Residential/Mixed — so the District Type filter alone lets
 *  them through. There's no server-side way to express a "does not contain"
 *  text match with the generic IN-list filter compiler, so it's applied
 *  here instead, against the district's actual name. */
function excludeConservationDistricts(fc: PolyFC | null): PolyFC | null {
  if (!fc) return null;
  const kept = fc.features.filter(
    (f) => !/conservation/i.test(String(f.properties?.['District Name'] ?? '')),
  );
  return kept.length > 0 ? { type: 'FeatureCollection', features: kept } : null;
}

function distinctValues(fc: PolyFC | null, prop: string): string[] {
  if (!fc) return [];
  const values = new Set<string>();
  for (const f of fc.features) {
    const v = f.properties?.[prop];
    if (v !== null && v !== undefined && v !== '') values.add(String(v));
  }
  return Array.from(values).sort();
}

export type BuildableOverlay = {
  geojson: FeatureCollection;
  acres: number;
};

/** Returns null when zoning/soil data isn't available yet, when there's no
 *  geometric overlap between them, or when flood hazard area covers the
 *  entire zoning+soil overlap — in every case, "no single buildable shape
 *  to show" rather than a possibly-misleading partial answer.
 *
 */
export function computeBuildableOverlay(
  zoningFc: FeatureCollection | null,
  soilFc: FeatureCollection | null,
  floodFc: FeatureCollection | null,
  townName?: string,
): BuildableOverlay | null {
  const zoning = excludeConservationDistricts(asPolygonFC(zoningFc));
  const soil = asPolygonFC(soilFc);
  if (!zoning || !soil) return null;

  try {
    // Snapshot per-feature attributes for the tooltip before union/intersect
    // discard them — a dissolved shape has no per-parcel properties left.
    const districtCount = zoning.features.length;
    const districtTypes = distinctValues(zoning, 'District Type');
    const suitabilityLevels = distinctValues(soil, 'Suitability');

    const zoningUnion = union(zoning);
    const soilUnion = union(soil);
    if (!zoningUnion || !soilUnion) return null;

    let buildable = intersect(pairFC(zoningUnion, soilUnion));
    if (!buildable) return null;

    const flood = asPolygonFC(floodFc);
    let floodExcluded = false;
    if (flood) {
      const floodUnion = union(flood);
      if (floodUnion) {
        // null here means flood fully covers the overlap — correctly "no
        // buildable area", not a fallback to the pre-flood shape.
        buildable = difference(pairFC(buildable, floodUnion));
        if (!buildable) return null;
        floodExcluded = true;
      }
    }

    const acres = area(buildable) * ACRES_PER_SQM;

    return {
      acres,
      geojson: {
        type: 'FeatureCollection',
        features: [
          {
            ...buildable,
            properties: {
              rgba_color: BUILDABLE_COLOR,
              tooltip: {
                __title__: townName
                  ? `Buildable Area — ${townName}`
                  : 'Buildable Area',
                Acreage: `${Math.round(acres).toLocaleString()} ac`,
                'Zoning Districts': districtCount,
                'District Types': districtTypes.join(', ') || '—',
                'Soil Suitability': suitabilityLevels.join(', ') || '—',
                'Flood Area Excluded': floodExcluded ? 'Yes' : 'No',
              },
            },
          },
        ],
      },
    };
  } catch (e) {
    console.error('buildable overlay computation failed', e);
    return null;
  }
}
