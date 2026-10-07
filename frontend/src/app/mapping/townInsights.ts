/**
 * @description
 *   Everything the explorer says about a town in words and numbers: the
 *   headline figures over the map, the map key, and the "at this spot"
 *   report for a clicked point. Pure functions of data already on the map —
 *   nothing here fetches.
 */

import { booleanPointInPolygon } from '@turf/turf';
import type { Feature, FeatureCollection } from 'geojson';
import type { LegendItem } from '@/components/Legend';
import { MAP_LAYERS } from './MapLayers';
import type { LayerStats } from './UseMapLayer';
import {
  BUILDABLE_COLOR,
  type BuildableOverlay,
  type PolyFeature,
} from './buildableOverlay';
import {
  css,
  legendItems,
  type ParcelColorMode,
  type RGBA,
} from './layerColors';

/** What is on the map for the selected town right now. */
export type TownMapState = {
  /** Short name for sentences, e.g. "Montpelier". */
  townName: string;
  townAcres: number | null;
  active: Set<string>;
  data: Record<string, FeatureCollection | null>;
  /** Zoning and soil are both on, so the map shows where they overlap
   *  instead of each layer's own polygons. */
  combined: boolean;
  overlay: BuildableOverlay | null;
  /** That overlap comes from the Buildable Areas preset's filters, so it is
   *  fair to call it "buildable". */
  buildablePreset: boolean;
  zoningStats: LayerStats | null;
  townCandidates: string[] | null;
  /** Acres of the town inside the flood zones / sewer service areas shown. */
  floodAcres: number | null;
  sewerAcres: number | null;
  parcelMode: ParcelColorMode;
  /** The grey "no zoning information" areas for this town. */
  unzoned: FeatureCollection | null;
};

/** A headline figure shown over the map. */
export type Insight = {
  id: string;
  color: string;
  value: string;
  label: string;
  detail?: string;
};

export type KeyGroup = {
  id: string;
  title: string;
  items: LegendItem[];
  note?: string;
};

/** One layer's answer to "what is at this spot?". */
export type SpotRow = {
  id: string;
  title: string;
  /** here: a feature covers the spot. none: the layer is on but nothing of
   *  it is here. off: the layer isn't on the map. */
  status: 'here' | 'none' | 'off';
  color?: string;
  fields: [string, unknown][];
};

const BUILDABLE_CSS = css(BUILDABLE_COLOR);
const SUITED_FOR_SEPTIC = new Set(['Well Suited', 'Moderately Suited']);

const acres = (n: number) =>
  n < 1 ? 'Under 1 acre' : `${Math.round(n).toLocaleString()} acres`;
const percent = (n: number) => `${n > 0 && n < 1 ? '<1' : Math.round(n)}%`;
const plural = (n: number, one: string, many: string) =>
  `${n.toLocaleString()} ${n === 1 ? one : many}`;
const dollars = (n: number) =>
  n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });

const isPolygon = (f: Feature) =>
  f.geometry?.type === 'Polygon' || f.geometry?.type === 'MultiPolygon';

/** Share of mapped soil in each suitability class. Acreage-weighted, not
 *  feature-count-weighted: suitability polygons are dissolved/merged per
 *  rating class upstream, so a handful of large polygons can outweigh many
 *  small ones — counting features would misrepresent how much land is
 *  actually in each class. */
function soilShares(fc: FeatureCollection): Map<string, number> | null {
  const acresByClass = new Map<string, number>();
  let totalAcres = 0;
  for (const feature of fc.features) {
    const key = String(feature.properties?.Suitability ?? 'Not Rated');
    const a = Number(feature.properties?.Acres) || 0;
    acresByClass.set(key, (acresByClass.get(key) ?? 0) + a);
    totalAcres += a;
  }
  if (totalAcres === 0) return null;
  return new Map(
    [...acresByClass].map(([label, a]) => [label, (a / totalAcres) * 100]),
  );
}

/** % of this town's zoned area that matches the active filters. Both sides
 *  are server-side unions (see LayerStats), so overlays aren't counted
 *  twice. Stats from a fetch scoped to a previous town are ignored. */
function zoningCoverage(s: TownMapState) {
  const { zoningStats, townCandidates } = s;
  if (!zoningStats || !townCandidates || zoningStats.scope !== townCandidates) {
    return null;
  }
  const candidates = new Set(townCandidates);
  let matchedAcres = 0;
  let totalAcres = 0;
  for (const t of zoningStats.towns) {
    if (!candidates.has(t.town)) continue;
    matchedAcres += t.matched_acres;
    totalAcres += t.total_acres;
  }
  if (totalAcres === 0) return null;
  return { matchedAcres, totalAcres, pct: (matchedAcres / totalAcres) * 100 };
}

/** Matched area per district type, as a share of the matched zoned area.
 *  Overlays sit on top of base districts, so with overlays present the
 *  shares can add up to more than 100%. */
function zoningShares(s: TownMapState): Map<string, number> | null {
  const coverage = zoningCoverage(s);
  if (!coverage || coverage.matchedAcres === 0) return null;
  if (!s.zoningStats?.districts.length) return null;
  return new Map(
    s.zoningStats.districts.map(({ district_type, acres: a }) => [
      district_type ?? 'Unknown',
      (a / coverage.matchedAcres) * 100,
    ]),
  );
}

function treatmentCapacity(fc: FeatureCollection) {
  let totalMgd = 0;
  let reporting = 0;
  for (const feature of fc.features) {
    const raw = feature.properties?.['Design Hydraulic Capacity'];
    if (raw === null || raw === undefined || String(raw).trim() === '') {
      continue;
    }
    const mgd = Number(raw);
    if (Number.isFinite(mgd)) {
      totalMgd += mgd;
      reporting += 1;
    }
  }
  return { totalMgd, reporting, total: fc.features.length };
}

function medianAssessedValue(fc: FeatureCollection): number | null {
  const values = fc.features
    .map((f) => f.properties?.['Assessed Value'])
    .filter((v): v is number => typeof v === 'number' && v > 0)
    .sort((a, b) => a - b);
  if (values.length === 0) return null;
  const mid = Math.floor(values.length / 2);
  return values.length % 2 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
}

const distinct = (fc: FeatureCollection, property: string) =>
  new Set(
    fc.features.map((f) => f.properties?.[property]).filter((v) => v != null),
  ).size;

/** The headline figures for whatever is on the map, one per layer (or one
 *  for the zoning + soil overlap when those are combined). A layer that is
 *  still loading says nothing yet. */
export function buildInsights(s: TownMapState): Insight[] {
  const out: Insight[] = [];
  const color = (id: string) =>
    MAP_LAYERS.find((l) => l.id === id)?.color ?? '#64748b';
  const shown = (id: string) => (s.active.has(id) ? s.data[id] : null) ?? null;
  const ofTown = (a: number) =>
    s.townAcres
      ? `${percent((a / s.townAcres) * 100)} of ${s.townName}`
      : undefined;

  const zoning = shown('zoning');
  const soil = shown('soil-suitability');

  if (s.combined) {
    if (s.overlay) {
      out.push({
        id: 'overlap',
        color: BUILDABLE_CSS,
        value: acres(s.overlay.acres),
        label: s.buildablePreset
          ? 'could support new housing'
          : 'where your zoning and soil layers overlap',
        detail: ofTown(s.overlay.acres),
      });
    } else if (zoning && soil) {
      out.push({
        id: 'overlap',
        color: BUILDABLE_CSS,
        value: 'None found',
        label: s.buildablePreset
          ? `No land in ${s.townName} passes every test`
          : 'Your zoning and soil layers do not overlap here',
      });
    }
  } else {
    if (zoning) {
      const coverage = zoningCoverage(s);
      const districts = distinct(zoning, 'District Name');
      if (zoning.features.length === 0) {
        out.push({
          id: 'zoning',
          color: color('zoning'),
          value: 'None',
          label: `No zoning districts to show in ${s.townName}`,
        });
      } else if (!coverage) {
        out.push({
          id: 'zoning',
          color: color('zoning'),
          value: districts.toLocaleString(),
          label: districts === 1 ? 'zoning district' : 'zoning districts',
        });
      } else if (coverage.pct >= 99.95) {
        out.push({
          id: 'zoning',
          color: color('zoning'),
          value: acres(coverage.totalAcres),
          label: `zoned, in ${plural(districts, 'district', 'districts')}`,
        });
      } else {
        out.push({
          id: 'zoning',
          color: color('zoning'),
          value: percent(coverage.pct),
          label: 'of zoned land matches your filters',
          detail: `${acres(coverage.matchedAcres)} of ${acres(coverage.totalAcres)}`,
        });
      }
    }

    if (soil) {
      const shares = soilShares(soil);
      if (!shares) {
        out.push({
          id: 'soil',
          color: color('soil-suitability'),
          value: 'None',
          label: `No soil ratings to show in ${s.townName}`,
        });
      } else {
        const suited = [...shares]
          .filter(([label]) => SUITED_FOR_SEPTIC.has(label))
          .reduce((sum, [, pct]) => sum + pct, 0);
        out.push({
          id: 'soil',
          color: color('soil-suitability'),
          value: percent(suited),
          label: 'of the soil shown suits a septic system',
          detail: 'Rated well or moderately suited',
        });
      }
    }
  }

  const flood = shown('flood-legal');
  if (flood && s.floodAcres !== null && s.floodAcres >= 0.5) {
    out.push({
      id: 'flood',
      color: color('flood-legal'),
      value: acres(s.floodAcres),
      label: 'inside the flood zones shown',
      detail: ofTown(s.floodAcres),
    });
  } else if (flood && (flood.features.length === 0 || s.floodAcres !== null)) {
    out.push({
      id: 'flood',
      color: color('flood-legal'),
      value: 'None',
      label: `None of the flood zones shown are in ${s.townName}`,
    });
  }

  const sewer = shown('service-areas');
  if (sewer && s.sewerAcres !== null && s.sewerAcres >= 0.5) {
    const systems = plural(distinct(sewer, 'System Name'), 'system', 'systems');
    const share = ofTown(s.sewerAcres);
    out.push({
      id: 'sewer',
      color: color('service-areas'),
      value: acres(s.sewerAcres),
      label: 'have sewer service',
      detail: share ? `${share} · ${systems}` : systems,
    });
  } else if (sewer && (sewer.features.length === 0 || s.sewerAcres !== null)) {
    out.push({
      id: 'sewer',
      color: color('service-areas'),
      value: 'None',
      label: `No sewer service areas in ${s.townName}`,
    });
  }

  const plants = shown('treatment-facilities');
  if (plants) {
    const { totalMgd, reporting, total } = treatmentCapacity(plants);
    const id = 'treatment';
    const c = color('treatment-facilities');
    if (total === 0) {
      out.push({
        id,
        color: c,
        value: 'None',
        label: `No treatment facilities in ${s.townName}`,
      });
    } else if (reporting === 0) {
      out.push({
        id,
        color: c,
        value: total.toLocaleString(),
        label: `treatment ${total === 1 ? 'facility' : 'facilities'}, none reporting a capacity`,
      });
    } else {
      out.push({
        id,
        color: c,
        value: `${totalMgd.toLocaleString('en-US', { maximumFractionDigits: 2 })} million`,
        label: 'gallons a day of treatment capacity',
        detail: `${reporting} of ${plural(total, 'facility reports', 'facilities report')} a capacity`,
      });
    }
  }

  const parcels = shown('parcels');
  if (parcels) {
    const count = parcels.features.length;
    const median = medianAssessedValue(parcels);
    out.push({
      id: 'parcels',
      color: color('parcels'),
      value: count === 0 ? 'None' : count.toLocaleString(),
      label:
        count === 0
          ? 'No properties match your filters'
          : count === 1
            ? 'property shown'
            : 'properties shown',
      detail: median ? `Median assessed value ${dollars(median)}` : undefined,
    });
  }

  return out;
}

/** The map key: one group per layer drawn, listing only the colors that
 *  are actually on the map, with each one's share where that is known. */
export function buildMapKey(s: TownMapState): KeyGroup[] {
  const groups: KeyGroup[] = [];

  if (s.overlay) {
    groups.push({
      id: 'overlap',
      title: s.buildablePreset ? 'Buildable land' : 'Zoning and soil overlap',
      items: [
        {
          label: s.buildablePreset
            ? 'Passes every test'
            : 'Where both layers overlap',
          color: BUILDABLE_CSS,
        },
      ],
    });
  }

  const unzonedColor = s.unzoned?.features[0]?.properties?.rgba_color;
  const unzonedItem: LegendItem | null =
    s.active.has('zoning') && Array.isArray(unzonedColor)
      ? { label: 'No zoning information', color: css(unzonedColor as RGBA) }
      : null;

  for (const layer of MAP_LAYERS) {
    if (!s.active.has(layer.id)) continue;
    const hidden =
      s.combined && (layer.id === 'zoning' || layer.id === 'soil-suitability');
    const fc = s.data[layer.id] ?? null;
    let items = hidden ? [] : legendItems(layer.id, fc, s.parcelMode);
    let title = layer.title;
    let note: string | undefined;

    if (layer.id === 'soil-suitability' && fc && !hidden) {
      const shares = soilShares(fc);
      items = items.map((i) => ({ ...i, share: shares?.get(i.label) }));
    }
    if (layer.id === 'zoning') {
      if (!hidden) {
        const shares = zoningShares(s);
        items = items.map((i) => ({ ...i, share: shares?.get(i.label) }));
        if (shares && items.some((i) => i.label === 'Overlay')) {
          note =
            'Overlay districts sit on top of others, so shares can add up to more than 100%.';
        }
      }
      if (unzonedItem) items = [...items, unzonedItem];
    }
    if (layer.id === 'parcels') {
      title =
        s.parcelMode === 'category'
          ? 'Properties, by type'
          : 'Properties, by assessed value';
    }

    if (items.length > 0) groups.push({ id: layer.id, title, items, note });
  }
  return groups;
}

/** What each layer has at one clicked point. Layers that are off are
 *  listed too, so the card can offer to turn them on. */
export function spotReport(
  s: TownMapState,
  coordinate: [number, number],
): SpotRow[] {
  // ponytail: linear scan of every polygon per layer, per click; add a
  // spatial index if parcels/soil in a large town make clicks feel slow.
  const featureAt = (fc: FeatureCollection | null) =>
    fc?.features.find(
      (f) =>
        isPolygon(f) && booleanPointInPolygon(coordinate, f as PolyFeature),
    );

  const rows: SpotRow[] = [];
  if (s.overlay) {
    rows.push({
      id: 'overlap',
      title: s.buildablePreset ? 'Buildable land' : 'Zoning and soil overlap',
      status: featureAt(s.overlay.geojson) ? 'here' : 'none',
      color: BUILDABLE_CSS,
      fields: [],
    });
  }

  for (const layer of MAP_LAYERS) {
    if (layer.points) continue;
    const row = { id: layer.id, title: layer.title, fields: [] };
    if (!s.active.has(layer.id)) {
      rows.push({ ...row, status: 'off' });
      continue;
    }
    const fc = s.data[layer.id];
    if (!fc) continue; // still loading
    const hit = featureAt(fc);
    const tooltip = hit?.properties?.tooltip as
      Record<string, unknown> | undefined;
    const fill = hit?.properties?.rgba_color;
    rows.push(
      hit
        ? {
            ...row,
            status: 'here',
            color: Array.isArray(fill) ? css(fill as RGBA) : layer.color,
            fields: layer.summaryFields.map((k) => [k, tooltip?.[k]]),
          }
        : { ...row, status: 'none' },
    );
  }
  return rows;
}
