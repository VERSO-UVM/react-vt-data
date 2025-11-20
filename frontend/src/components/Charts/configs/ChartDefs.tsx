// chartDefs.ts\
import { BASE_API_URL } from '@/config';

export interface ChartDef {
  id: string;
  title: string;
  xField: string;
  yField: string;
  subtype: string;
  chartParams?: any;
  url: string;
  filterkey?: string;
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
    filterkey: 'aggregated_acres',
  },

];