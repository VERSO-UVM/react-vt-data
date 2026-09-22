/**
 * @description
 *   Client-side color overrides for map layers.
 *
 *   The backend already colors zoning (by District Type) and soil
 *   suitability (a green->red ordinal scale) reasonably, but a few real
 *   problems show up once layers are stacked:
 *     - Service Areas, Nonresidential zoning, and "Well Suited" soil are all
 *       the exact same green ([44,160,44,...]), so overlapping layers become
 *       indistinguishable.
 *     - Treatment Facilities carry no rgba_color at all, so their point
 *       markers render fully transparent.
 *
 *   Rather than editing the warehouse color tables (they're build-pipeline
 *   output), each layer that needs a fix gets a distinct hue *family* here so
 *   a viewer can tell which dataset a color belongs to at a glance, while
 *   ordinal layers (soil suitability) keep their good/bad color logic within
 *   that family. Soil suitability and flood already do this correctly
 *   server-side and are left untouched.
 */

import type { FeatureCollection } from 'geojson';

type RGBA = [number, number, number, number];

const ZONING_DISTRICT_COLORS: Record<string, RGBA> = {
  Residential: [37, 99, 235, 190], // blue-600
  Mixed: [147, 197, 253, 190], // blue-300
  Nonresidential: [30, 58, 138, 190], // blue-900
  Overlay: [148, 163, 184, 110], // slate-400, lighter — secondary info
};
const ZONING_DEFAULT: RGBA = [100, 116, 139, 150]; // slate-500

const SERVICE_AREA_COLOR: RGBA = [124, 58, 237, 170]; // violet-600
const TREATMENT_FACILITY_COLOR: RGBA = [8, 145, 178, 220]; // cyan-700

// Parcel CATEGORY values (see backend/data_cleaning/parcels_constants.py's
// CAT_MAP) are folded from 15 raw codes down to 3 buckets — the dataviz
// skill's categorical palette only clears its CVD/contrast gates "all pairs"
// (the comparison a choropleth needs, vs. just adjacent) for its first three
// slots; a 4th puts two confusable hues on screen together.
type ParcelCategoryBucket = 'Residential' | 'Commercial / Industrial' | 'Other';

const PARCEL_CATEGORY_COLORS: Record<ParcelCategoryBucket, RGBA> = {
  Residential: [42, 120, 214, 190], // dataviz slot 1 — blue
  'Commercial / Industrial': [235, 104, 52, 190], // dataviz slot 2 — orange
  Other: [27, 175, 122, 190], // dataviz slot 3 — aqua
};
const PARCEL_CATEGORY_DEFAULT: RGBA = [148, 163, 184, 150]; // slate-400

function bucketParcelCategory(
  category: string | undefined,
): ParcelCategoryBucket {
  const c = (category ?? '').toLowerCase();
  if (
    c.startsWith('residential') ||
    c.startsWith('seasonal') ||
    c.startsWith('mobile home')
  ) {
    return 'Residential';
  }
  if (
    c.startsWith('commercial') ||
    c.startsWith('industrial') ||
    c.startsWith('utility')
  ) {
    return 'Commercial / Industrial';
  }
  return 'Other';
}

// dataviz skill's validated sequential blue ramp (references/palette.md),
// light -> dark, for the "Assessed Value" coloring mode.
const PARCEL_VALUE_RAMP: RGBA[] = [
  [183, 211, 246, 190], // step 150
  [109, 167, 236, 190], // step 300
  [42, 120, 214, 190], // step 450
  [24, 79, 149, 190], // step 600
  [13, 54, 107, 190], // step 700
];
const PARCEL_VALUE_DEFAULT: RGBA = [148, 163, 184, 150]; // slate-400, missing value

export type ParcelColorMode = 'category' | 'value';

/** Recolor a parcels FeatureCollection by CATEGORY (fixed 3-bucket palette)
 *  or by Assessed Value (5-step quantile ramp, computed from the values
 *  currently on screen so the ramp stays meaningful at any zoom/town). */
export function recolorParcels(
  fc: FeatureCollection,
  mode: ParcelColorMode,
): FeatureCollection {
  if (mode === 'category') {
    return recolorByProperty(
      fc,
      'Category',
      // recolorByProperty keys on the raw property value, so pre-bucket it.
      Object.fromEntries(
        fc.features.map((f) => [
          String(f.properties?.Category),
          PARCEL_CATEGORY_COLORS[
            bucketParcelCategory(f.properties?.Category as string | undefined)
          ],
        ]),
      ),
      PARCEL_CATEGORY_DEFAULT,
    );
  }

  const values = fc.features
    .map((f) => f.properties?.['Assessed Value'])
    .filter((v): v is number => typeof v === 'number' && !Number.isNaN(v))
    .sort((a, b) => a - b);

  const breaks = [0.2, 0.4, 0.6, 0.8].map(
    (q) => values[Math.min(values.length - 1, Math.floor(q * values.length))],
  );

  const bucketOf = (v: number) => breaks.filter((b) => v > b).length;

  return {
    ...fc,
    features: fc.features.map((f) => {
      const v = f.properties?.['Assessed Value'];
      const color =
        typeof v === 'number' && !Number.isNaN(v) && values.length > 0
          ? PARCEL_VALUE_RAMP[bucketOf(v)]
          : PARCEL_VALUE_DEFAULT;
      return { ...f, properties: { ...f.properties, rgba_color: color } };
    }),
  };
}

function recolorByProperty(
  fc: FeatureCollection,
  property: string,
  palette: Record<string, RGBA>,
  fallback: RGBA,
): FeatureCollection {
  return {
    ...fc,
    features: fc.features.map((f) => ({
      ...f,
      properties: {
        ...f.properties,
        rgba_color: palette[String(f.properties?.[property])] ?? fallback,
      },
    })),
  };
}

function recolorFlat(fc: FeatureCollection, color: RGBA): FeatureCollection {
  return {
    ...fc,
    features: fc.features.map((f) => ({
      ...f,
      properties: { ...f.properties, rgba_color: color },
    })),
  };
}

/** Apply this app's layer color conventions to a freshly-fetched
 *  FeatureCollection. No-op for layers that don't need an override. */
export function recolorLayer(
  layerId: string,
  fc: FeatureCollection,
): FeatureCollection {
  switch (layerId) {
    case 'zoning':
      return recolorByProperty(
        fc,
        'District Type',
        ZONING_DISTRICT_COLORS,
        ZONING_DEFAULT,
      );
    case 'service-areas':
      return recolorFlat(fc, SERVICE_AREA_COLOR);
    case 'treatment-facilities':
      return recolorFlat(fc, TREATMENT_FACILITY_COLOR);
    default:
      return fc;
  }
}
