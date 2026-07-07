import { filterDef } from './filterTypes';

export const cdc_filtering: filterDef[] = [
  {
    filter_table: 'cdc_places',
    filter_style: 'Cascade',
    label: 'Variable 1',
  },
  {
    filter_table: 'cdc_places',
    filter_style: 'Cascade',
    label: 'Variable 2',
  },
];

export const zoning_filtering: filterDef[] = [
  {
    filter_table: 'zoning_wide',
    filter_style: 'Checkbox',
    label: 'Zoning',
  },
];
