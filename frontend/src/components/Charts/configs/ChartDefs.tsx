// chartDefs.ts\
import { BASE_API_URL } from '@/config';
import { TableColumnConfig } from '@/types/cachedCharts';

export interface TableRowDef {
  label: string;
  variable: string;
  section?: string;
}

export interface TableConfig {
  rows: TableRowDef[];
  extraParams?: Record<string, any>; // year_min, year_max, etc.
  renderCell?: (d: any) => string; // defaults to percent formatting
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
    title: 'Demographic Profile',
    url: `${BASE_API_URL}/load/acs5-db/tidy/demographics`,
    xField: '',
    yField: '',
    subtype: 'table', // signals to the renderer to use TableStack not ChartStack
    tableConfig: {
      extraParams: { year_min: 2010, year_max: 2023 },
      rows: [
        { label: 'Male', variable: 'Male', section: 'Age/Sex' },
        { label: 'Female', variable: 'Female', section: 'Age/Sex' },
        // ...etc
      ],
    },
  },
];
