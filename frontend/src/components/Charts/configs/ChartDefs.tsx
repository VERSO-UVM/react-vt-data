// chartDefs.ts\
import { BASE_API_URL } from '@/config';
import { TableColumnConfig } from '@/types/cachedCharts';

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
];
