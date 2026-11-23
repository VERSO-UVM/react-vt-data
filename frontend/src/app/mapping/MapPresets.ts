/**
 * @description
 *   Curated "use case" preset filter combinations for the mapping explorer. Each preset is a
 *   named subset of MAP_LAYERS ids to activate, plus optional initial filter
 *   specs (keyed by layer id) applied automatically when the preset is
 *   selected. The explorer offers each one as a question to ask of a town.
 *   Add a new preset here and it shows up in the picker automatically — no
 *   other file needs to change.
 */

import type { ComponentType } from 'react';
import {
  IconBuildingCommunity,
  IconDroplet,
  IconHome2,
  IconHomeSearch,
  IconRipple,
} from '@tabler/icons-react';
import type { FilterSpec } from '@/components/FilterRedux/filterTypes';

export type MapPreset = {
  id: string;
  label: string;
  /** The preset phrased as the question it answers — what the picker shows. */
  question: string;
  description: string;
  icon: ComponentType<{ size?: number; stroke?: number }>;
  definition?: string;
  /** `definition` as a checklist, one test per line. Keep the two in sync. */
  criteria?: string[];
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
  "it falls outside FEMA's Special Flood Hazard Area (the high-risk, " +
  '1%-annual-chance floodplain).';

export const MAP_PRESETS: MapPreset[] = [
  {
    id: 'buildable-areas',
    label: 'Buildable Areas',
    question: 'Where could housing be built?',
    description:
      'Land where zoning allows homes, the soil suits a septic system, and it sits outside the high-risk flood zone.',
    icon: IconHomeSearch,
    definition: BUILDABLE_AREAS_DEFINITION,
    criteria: [
      'Zoning: a residential or mixed district that allows 1–4 family homes, either permitted outright or after a public hearing. Nonresidential, overlay and conservation districts are left out.',
      'Soil: well or moderately suited for an on-site septic system.',
      'Flooding: outside FEMA’s Special Flood Hazard Area — the high-risk, 1%-annual-chance floodplain.',
    ],
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
      // Locked to the high-risk zones the overlay subtracts (see
      // buildableOverlay.ts), so the user can't quietly filter them away.
      'flood-legal': [
        {
          filter_table: 'FEMA_floodHazard_geom',
          filters: { 'Flood Risk': ['High'] },
          cols: ['Flood Risk'],
        },
      ],
    },
  },
  {
    id: 'zoning',
    label: 'Zoning',
    question: 'What does zoning allow?',
    description: 'Zoning districts, colored by what each is mainly for.',
    icon: IconBuildingCommunity,
    layers: ['zoning'],
  },
  {
    id: 'flood-zones',
    label: 'Flood Zones',
    question: 'Where are the flood zones?',
    description: 'FEMA’s mapped flood hazard areas.',
    icon: IconRipple,
    layers: ['flood-legal'],
  },
  {
    id: 'infrastructure',
    label: 'Infrastructure',
    question: 'Where is sewer service available?',
    description:
      'Wastewater service areas and treatment facilities serving each jurisdiction.',
    icon: IconDroplet,
    layers: ['treatment-facilities', 'service-areas'],
  },
  {
    id: 'properties',
    label: 'Properties',
    question: 'Who owns the land?',
    description: 'Parcel lines, with the owner and assessed value of each.',
    icon: IconHome2,
    layers: ['parcels'],
  },
];
