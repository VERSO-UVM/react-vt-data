import { ChartItem } from '@/types/cachedCharts';
import { v4 as uuidv4 } from 'uuid';

import { TableColumnConfig } from '@/types/cachedCharts';

interface ChartItemConfig<TData> {
  title: string;
  xField: string;
  yField: string;
  subtype: string;
  data: TData[];
  chartParams?: Record<string, any>;
  description?: string;
  compareData?: TData[];
  notes?: string;
  metadata?: Record<string, any>;
  compareTableData?: TData[];
  categories?: string[];

  tableData?: TData[];
  showCols?: TableColumnConfig[];
}

export function createChartItem<TData>(
  config: ChartItemConfig<TData>,
): ChartItem<TData> {
  return {
    id: `${config.title.replace(/\s/g, '')}-${uuidv4()}`,
    title: config.title,
    createdAt: new Date().toISOString(),
    type: 'chart',
    subtype: config.subtype,
    categories: config.categories,
    xField: config.xField,
    yField: config.yField,
    data: config.data,
    chartParams: config.chartParams,
    description: config.description,
    compareData: config.compareData,
    notes: config.notes,
    metadata: config.metadata,

    tableData: config.tableData,
    showCols: config.showCols,
  };
}
export function createTableItem<TData>(config: {
  title: string;
  data: TData[];
  notes?: string;
  metadata?: Record<string, any>;
  description?: string;
  subtype?: string;
  trendChart?: string;
  categories?: string[];
  compareData?: TData[];
  chartParams?: Record<string, any>;
}): ChartItem<TData> {
  return {
    id: `${config.title.replace(/\s/g, '')}-${uuidv4()}`,
    title: config.title,
    createdAt: new Date().toISOString(),
    type: 'chart',
    subtype: config.subtype ?? 'renderTable',
    trendChart: config.trendChart,
    categories: config.categories,
    xField: '',
    yField: '',
    data: config.data,
    compareData: config.compareData,
    chartParams: config.chartParams,
    notes: config.notes,
    description: config.description,
    metadata: config.metadata,
  };
}
