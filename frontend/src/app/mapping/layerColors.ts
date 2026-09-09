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
