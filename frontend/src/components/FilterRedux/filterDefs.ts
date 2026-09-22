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
  {
    filter_table: 'VersoZoning_wide',
    filter_style: 'Range',
    label: 'Minimum Lot Size',
    cols: [
      'Single Family Min Lot Size (ac)',
      'Two Family Min Lot Size (ac)',
      'Three Family Min Lot Size (ac)',
      'Four Family Min Lot Size (ac)',
    ],
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

export const ambulance_filtering: filterDef[] = [
  {
    filter_table: 'VCGI_ambulanceService_info',
    filter_style: 'Checkbox',
    label: 'Certification Level',
    cols: ['Certification Level'],
  },
];

export const parcels_filtering: filterDef[] = [
  {
    filter_table: 'VCGIParcels_info',
    filter_style: 'Checkbox',
    label: 'Category',
    cols: ['Category'],
  },
  {
    filter_table: 'VCGIParcels_info',
    filter_style: 'Checkbox',
    label: 'Vacant Land',
    cols: ['Vacant Land'],
  },
  {
    filter_table: 'VCGIParcels_info',
    filter_style: 'Range',
    label: 'Parcel Size',
    cols: ['Parcel Size (ac)'],
  },
  {
    filter_table: 'VCGIParcels_tax',
    filter_style: 'Range',
    label: 'Price',
    cols: ['Assessed Value', 'Value Per Acre'],
  },
];
