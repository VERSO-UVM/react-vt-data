// chartDefs.ts\
import { BASE_API_URL } from '@/config';
import { TableColumnConfig } from '@/types/cachedCharts';

export interface TableRowDef {
  label: string;
  variable: string;
  section?: string;
}

export interface TableConfig {
  extraParams?: Record<string, any>; // year_min, year_max, etc.
}

export interface ChartDef {
  id: string;
  title: string;
  xField: string;
  yField: string;
  subtype: string;
  chartParams?: any;
  url: string;
  filterKey?: string;
  dataKey?: string;
  notes?: string;
  showCols?: TableColumnConfig[];
  tableConfig?: TableConfig;
}

export const chartDefs: ChartDef[] = [
  {
    id: 'acreage',
    title: 'Acreage Chart',
    xField: 'District Type',
    yField: 'Acres',
    subtype: 'CompareDiffPerXBarChart',
    chartParams: { color: 'hex_color', legendLabels: ['Main', 'Compare'] },
    url: `${BASE_API_URL}/load/mapping/zoning`,
    filterKey: 'aggregated_acres',
    notes: 'Acreage is defined as a good time.',
    showCols: [
      { key: 'County' },
      { key: 'Jurisdiction District Name' },
      { key: 'District Type' },
      { key: 'Acres', label: 'Total Acres' },
      { key: 'hex_color', visible: false },
    ],
  },
  {
    id: 'tenure',
    title: 'Housing Tenure',
    xField: 'Occupied Tenure',
    yField: 'Value',
    subtype: 'CompareDiffPerXBarChart',
    chartParams: {
      colorScheme: 'schemeAccent',
      legendLabels: ['Main', 'Compare'],
    },
    dataKey: 'plot_data.tenure_df',
    url: `${BASE_API_URL}/load/census/housing/snapshot`,
  },
  {
    id: 'demographics',
    title: 'Demographics — Percent',
    url: `${BASE_API_URL}/load/acs5-db/tidy/demographics`,
    xField: '',
    yField: '',
    subtype: 'renderTable', // signals to the renderer to use TableStack not ChartStack
    filterKey: '',
    dataKey: '',
    tableConfig: {
      extraParams: { year_min: 2010, year_max: 2023 },
    },
  },
  {
    id: 'demographics_estimates',
    title: 'Demographics — Value',
    url: `${BASE_API_URL}/load/acs5-db/tidy/demographics`,
    xField: '',
    yField: '',
    subtype: 'renderTableEstimates',
    filterKey: '',
    dataKey: '',
    tableConfig: {
      extraParams: { year_min: 2010, year_max: 2023 },
    },
  },
  {
    id: 'education',
    title: 'Educational Attainment — Percent',
    url: `${BASE_API_URL}/load/acs5-db/tidy/education`,
    xField: '',
    yField: '',
    subtype: 'renderTable',
    filterKey: '',
    dataKey: '',
    tableConfig: {
      extraParams: { year_min: 2012, year_max: 2023 },
    },
  },
  {
    id: 'education_estimates',
    title: 'Educational Attainment — Value',
    url: `${BASE_API_URL}/load/acs5-db/tidy/education`,
    xField: '',
    yField: '',
    subtype: 'renderTableEstimates',
    filterKey: '',
    dataKey: '',
    tableConfig: {
      extraParams: { year_min: 2012, year_max: 2023 },
    },
  },
];
