import { filterDef } from './filterTypes';

export const cdc_filtering: filterDef[] = [
  {
    filter_table: 'cdc_places_county',
    filter_style: 'Cascade',
    label: 'Variable 1',
  },
  {
    filter_table: 'cdc_places_county',
    filter_style: 'Cascade',
    label: 'Variable 2',
  },
];

export const zoning_filtering: filterDef[] = [
  {
    filter_table: 'VersoZoning_wide',
    filter_style: 'Checkbox',
    label: '',
  },
];

export const soil_suitability_filtering: filterDef[] = [
  {
    filter_table: 'VersoWastewater_soilSuitability_info',
    filter_style: 'Cascade',
    label: 'Soil Suitability',
  },
];

export const treatment_facility_filtering: filterDef[] = [
  {
    filter_table: 'VersoWastewater_treatmentFacilities_info',
    filter_style: 'Cascade',
    label: 'Treatment Facilities',
  },
];

export const service_area_filtering: filterDef[] = [
  {
    filter_table: 'VersoWastewater_serviceAreas_info',
    filter_style: 'Cascade',
    label: 'Service Areas',
  },
];
