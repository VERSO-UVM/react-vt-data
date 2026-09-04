/**
 * @description
 *   Curated "use case" presets for the mapping explorer. Each preset is a
 *   named subset of MAP_LAYERS ids to activate, plus optional initial filter
 *   specs (keyed by layer id) applied automatically when the preset is
 *   selected. Add a new preset here and it shows up in the picker
 *   automatically — no other file needs to change.
 */

import type { FilterSpec } from '@/components/FilterRedux/filterTypes';

export type MapPreset = {
  id: string;
  label: string;
  description: string;
  layers: string[];
  /** layer id -> initial FilterSpec[] (same shape/order as that layer's filterList) */
  filters?: Record<string, FilterSpec[]>;
};

// Zoning's F1F/F2F/F3F/F4F "Allowance" columns don't have an explicit
// "Allowed/Conditional" value — their real values are Permitted, Prohibited,
// Overlay, and Public Hearing. "Public Hearing" is the closest analog to a
// conditional-use approval, so it's treated as buildable alongside Permitted.
const HOUSING_TYPE_LABELS = [
  'Single Family',
  'Two Family',
  'Three Family',
  'Four Family',
];
const BUILDABLE_ZONING_STATUSES = ['Permitted', 'Public Hearing'];

export const MAP_PRESETS: MapPreset[] = [
  {
    id: 'buildable-areas',
    label: 'Buildable Areas',
    description:
      'Zoning that permits housing, soil suited for on-site septic, and flood hazard areas to check.',
    layers: ['zoning', 'soil-suitability', 'flood-legal'],
    filters: {
      zoning: [
        {
          filter_table: 'VersoZoning_wide',
          filters: Object.fromEntries(
            HOUSING_TYPE_LABELS.map((label) => [
              label,
              BUILDABLE_ZONING_STATUSES,
            ]),
          ),
        },
      ],
      'soil-suitability': [
        {
          filter_table: 'VersoWastewater_soilSuitability_info',
          filters: {
            'Soil Suitability Level': ['Well Suited', 'Moderately Suited'],
          },
          cols: ['Soil Suitability Level'],
        },
      ],
    },
  },
  {
    id: 'infrastructure',
    label: 'Infrastructure',
    description:
      'Wastewater service areas and treatment facilities serving each jurisdiction.',
    layers: ['treatment-facilities', 'service-areas'],
  },
];
