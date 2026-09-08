/**
 * @description
 *   Curated "use case" preset filter combinations for the mapping explorer. Each preset is a
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
  definition?: string;
  layers: string[];
  filters?: Record<string, FilterSpec[]>;
};

const HOUSING_TYPE_LABELS = [
  'Single Family',
  'Two Family',
  'Three Family',
  'Four Family',
];

// "Public Hearing" and "Permitted" allowances are treated as buildable alongside Permitted.
const BUILDABLE_ZONING_STATUSES = ['Permitted', 'Public Hearing'];

const RESIDENTIAL_DISTRICT_TYPES = [
  'Primarily Residential',
  'Mixed with Residential',
];

// Displayed frontend definition of "Buildable Areas"
export const BUILDABLE_AREAS_DEFINITION =
  'A parcel counts as buildable when all of the following hold: ' +
  'its zoning district is Primarily Residential or Mixed with Residential ' +
  '(Nonresidential, Overlay, and conservation-named districts are excluded) ' +
  'and permits 1-4 family housing, either Permitted outright or by Public ' +
  'Hearing; its soil is Well or Moderately Suited for on-site septic; and ' +
  "it falls outside FEMA's mapped flood hazard area.";

export const MAP_PRESETS: MapPreset[] = [
  {
    id: 'buildable-areas',
    label: 'Buildable Areas',
    description:
      'Zoning that permits housing, soil suited for on-site septic, and flood hazard areas to check.',
    definition: BUILDABLE_AREAS_DEFINITION,
    layers: ['zoning', 'soil-suitability', 'flood-legal'],
    filters: {
      zoning: [
        {
          filter_table: 'VersoZoning_wide',
          filters: {
            'District Type': RESIDENTIAL_DISTRICT_TYPES,
            ...Object.fromEntries(
              HOUSING_TYPE_LABELS.map((label) => [
                label,
                BUILDABLE_ZONING_STATUSES,
              ]),
            ),
          },
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
