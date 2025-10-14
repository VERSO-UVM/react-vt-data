import { ChartItem } from '@/types/cachedCharts';
import { v4 as uuidv4 } from 'uuid';

interface ChartItemConfig<TData> {
  title: string;
  xField: string;
  yField: string;
  data: TData[];
  chartParams?: Record<string, any>;
}

export function createChartItem<TData>(
  config: ChartItemConfig<TData>,
): ChartItem<TData> {
  return {
    id: `${config.title.replace(/\s/g, '')}-${uuidv4()}`,
    title: config.title,
    createdAt: new Date().toISOString(),
    type: 'chart',
    xField: config.xField,
    yField: config.yField,
    data: config.data,
    chartParams: config.chartParams,
  };
}
