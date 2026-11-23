/**
 * @description
 *   Registry of every dataset that can appear as a layer on the unified
 *   mapping explorer. Add a new dataset here and it shows up in the
 *   LayerPanel automatically — no other file needs to change.
 */

import type { ComponentType } from 'react';
import {
  IconBuildingCommunity,
  IconBuildingFactory2,
  IconDroplet,
  IconHome2,
  IconRipple,
  IconShovel,
} from '@tabler/icons-react';
import { BASE_API_URL } from '@/config';
import type {
  FilterSpec,
  filterDef,
} from '@/components/FilterRedux/filterTypes';
import {
  flood_filtering,
  soil_suitability_filtering,
  zoning_filtering,
  parcels_filtering,
} from '@/components/FilterRedux/filterDefs';

/**
 * How the dataURL's response is shaped:
 *  - 'direct'       -> response.data IS the FeatureCollection
 *  - 'geojson-stats' -> response.data is { geojson, stats } (zoning today)
 *
 * NOTE: only zoning is confirmed 'geojson-stats' (see zoning/page.tsx).
 * The wastewater/flood endpoints are assumed 'direct' based on the old
 * page_content.tsx, which did `setData(response.data as FeatureCollection)`.
 * Verify against the actual API before shipping.
 */
export type ResponseShape = 'direct' | 'geojson-stats';

/** How to auto-scope a layer's fetch to the selected town: which table (and
 *  under which filter label) carries the town/jurisdiction name. Merged into
 *  that layer's request filters automatically once a town is selected — see
 *  UseMapLayer.ts. Omit for layers with no town-name column (flood, which is
 *  small enough statewide to not need it). */
export type JurisdictionScope = {
  filterTable: string;
  label: string;
};

export type MapLayerConfig = {
  id: string;
  /** Plain-language name — what a first-time visitor would call it. */
  title: string;
  /** One line on what the layer shows, under its name in the layer list. */
  description: string;
  icon: ComponentType<{ size?: number; stroke?: number }>;
  dataURL: string;
  method: 'GET' | 'POST';
  filterList: filterDef[];
  legendURL?: string;
  /** Filters applied on first load when no preset supplies its own. */
  defaultFilters?: FilterSpec[];
  responseShape: ResponseShape;
  /** Accent for this layer's icon and switch — close to how it's drawn. */
  color: string;
  jurisdiction?: JurisdictionScope;
  /** The tooltip fields (as named in this layer's geo query) that sum a
   *  feature up: all the hover tooltip shows, and what the spot card lists
   *  for this layer. */
  summaryFields: string[];
  /** The tooltip field that names a single feature (an address, a district
   *  name) — the spot card's heading. */
  nameField?: string;
  /** Drawn as points rather than areas, so it can't answer "what is at this
   *  spot" for a clicked location. */
  points?: true;
};

export const MAP_LAYERS: MapLayerConfig[] = [
  {
    id: 'flood-legal',
    title: 'Flood zones',
    description: 'FEMA-mapped areas at risk of flooding.',
    icon: IconRipple,
    dataURL: `${BASE_API_URL}/load/mapping/flood_legal`,
    method: 'POST',
    filterList: flood_filtering,
    // Zone X (Moderate/Minimal risk) covers most of the state and renders
    // transparent anyway, so leave it out of the default download.
    defaultFilters: [
      {
        filter_table: 'FEMA_floodHazard_geom',
        filters: { 'Flood Risk': ['High', 'Undetermined'] },
        cols: ['Flood Risk'],
      },
    ],
    responseShape: 'direct',
    color: '#E0521A',
    summaryFields: ['Flood Risk', 'Flood Zone Type'],
  },
  {
    id: 'soil-suitability',
    title: 'Soil for septic systems',
    description: 'How suitable the ground is for an on-site septic system.',
    icon: IconShovel,
    dataURL: `${BASE_API_URL}/load/mapping/wastewater/septic_soil_suitability`,
    method: 'POST',
    filterList: soil_suitability_filtering,
    legendURL: `${BASE_API_URL}/load/mapping/wastewater/septic_soil_legend`,
    responseShape: 'direct',
    color: '#4F9A3A',
    summaryFields: ['Suitability Level'],
    nameField: 'Suitability Level',
    jurisdiction: {
      filterTable: 'VersoWastewater_soilSuitability_info',
      label: 'Jurisdiction',
    },
  },
  {
    id: 'treatment-facilities',
    title: 'Wastewater treatment facilities',
    description:
      'Permitted facilities that treat wastewater, and their capacity.',
    icon: IconBuildingFactory2,
    dataURL: `${BASE_API_URL}/load/mapping/wastewater/treatment_facility`,
    method: 'POST',
    filterList: [],
    responseShape: 'direct',
    color: '#0891B2',
    summaryFields: ['Facility Name', 'Design Hydraulic Capacity'],
    points: true,
    nameField: 'Facility Name',
    jurisdiction: {
      filterTable: 'VersoWastewater_treatmentFacilities_info',
      label: 'Jurisdiction',
    },
  },
  {
    id: 'service-areas',
    title: 'Sewer service areas',
    description: 'Areas served by a wastewater (sewer) system.',
    icon: IconDroplet,
    dataURL: `${BASE_API_URL}/load/mapping/wastewater/service_area`,
    method: 'POST',
    filterList: [],
    responseShape: 'direct',
    color: '#7C3AED',
    summaryFields: ['System Name'],
    nameField: 'System Name',
    jurisdiction: {
      filterTable: 'VersoWastewater_serviceAreas_info',
      label: 'Jurisdiction',
    },
  },
  {
    id: 'zoning',
    title: 'Zoning districts',
    description: 'Local rules for what can be built, and where.',
    icon: IconBuildingCommunity,
    dataURL: `${BASE_API_URL}/load/mapping/zoning/standard_new`,
    method: 'POST',
    filterList: zoning_filtering,
    responseShape: 'geojson-stats',
    color: '#2563EB',
    summaryFields: ['District', 'Type'],
    nameField: 'District',
    jurisdiction: {
      filterTable: 'VersoZoning_info',
      label: 'Jurisdiction',
    },
  },
  {
    id: 'parcels',
    title: 'Properties',
    description: 'Parcel lines, owners and assessed values.',
    icon: IconHome2,
    dataURL: `${BASE_API_URL}/load/mapping/parcels/standard`,
    method: 'POST',
    filterList: parcels_filtering,
    responseShape: 'direct',
    color: '#475569',
    summaryFields: ['Address', 'Category', 'Acres', 'Assessed Value'],
    nameField: 'Address',
    jurisdiction: {
      filterTable: 'VCGIParcels_info',
      label: 'Jurisdiction',
    },
  },
];

// Zoning's grey "no zoning information here" backdrop is not a toggleable
// layer in its own right — it's always drawn beneath zoning when zoning is
// active, and fetched once up front (see explorer/page.tsx).
export const UNZONED_URL = `${BASE_API_URL}/load/mapping/zoning/unzoned`;
