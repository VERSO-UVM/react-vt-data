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
    filter_style: 'Checkbox',
    label: 'Soil Suitability Level',
    cols: ['Soil Suitability Level'],
  },
];

export const treatment_facility_filtering: filterDef[] = [
  {
    filter_table: 'VersoWastewater_treatmentFacilities_info',
    filter_style: 'Checkbox',
    label: 'Treatment Facilities',
    cols: ['County'],
  },
];

export const service_area_filtering: filterDef[] = [
  {
    filter_table: 'VersoWastewater_serviceAreas_info',
    filter_style: 'Checkbox',
    label: 'Service Areas',
    cols: ['County'],
  },
];
