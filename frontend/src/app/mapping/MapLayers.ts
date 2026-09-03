/**
 * @description
 *   Registry of every dataset that can appear as a layer on the unified
 *   mapping explorer. Add a new dataset here and it shows up in the
 *   LayerPanel automatically — no other file needs to change.
 */

import { BASE_API_URL } from '@/config';
import { filterDef } from '@/components/FilterRedux/filterTypes';
import {
  soil_suitability_filtering,
  treatment_facility_filtering,
  service_area_filtering,
  zoning_filtering,
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

export type MapLayerConfig = {
  id: string;
  title: string;
  dataURL: string;
  method: 'GET' | 'POST';
  filterList: filterDef[];
  legendURL?: string;
  responseShape: ResponseShape;
  color: string;
};

export const MAP_LAYERS: MapLayerConfig[] = [
  {
    id: 'flood-legal',
    title: 'Flood Insurance',
    dataURL: `${BASE_API_URL}/load/mapping/flood_legal`,
    method: 'GET',
    filterList: [],
    responseShape: 'direct',
    color: '#3b6cff',
  },
  {
    id: 'soil-suitability',
    title: 'Soil Suitability',
    dataURL: `${BASE_API_URL}/load/mapping/wastewater/septic_soil_suitability`,
    method: 'POST',
    filterList: soil_suitability_filtering,
    legendURL: `${BASE_API_URL}/load/mapping/wastewater/septic_soil_legend`,
    responseShape: 'direct',
    color: '#c98a2b',
  },
  {
    id: 'treatment-facilities',
    title: 'Wastewater Treatment Facilities',
    dataURL: `${BASE_API_URL}/load/mapping/wastewater/treatment_facility`,
    method: 'POST',
    filterList: treatment_facility_filtering,
    responseShape: 'direct',
    color: '#2bb673',
  },
  {
    id: 'service-areas',
    title: 'Wastewater Service Areas',
    dataURL: `${BASE_API_URL}/load/mapping/wastewater/service_area`,
    method: 'POST',
    filterList: service_area_filtering,
    responseShape: 'direct',
    color: '#8a5bd6',
  },
  {
    id: 'zoning',
    title: 'Zoning',
    dataURL: `${BASE_API_URL}/load/mapping/zoning/standard_new`,
    method: 'POST',
    filterList: zoning_filtering,
    responseShape: 'geojson-stats',
    color: '#d64545',
  },
];

// Zoning's grey "no zoning information here" backdrop is not a toggleable
// layer in its own right — it's always drawn beneath zoning when zoning is
// active, and fetched once up front (see explorer/page.tsx).
export const UNZONED_URL = `${BASE_API_URL}/load/mapping/zoning/unzoned`;
