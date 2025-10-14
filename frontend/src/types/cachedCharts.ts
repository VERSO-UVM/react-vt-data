interface BaseItem<TData = any> {
  id: string;
  title: string;
  type: 'chart' | 'counter' | 'map' | string;
  createdAt?: string;
  dataRef?: ItemDataRef;
  data?: TData[];
}

interface ItemDataRef {
  datasetId: string;
  filters?: Record<string, any>;
  params?: Record<string, any>;
}

interface ChartItem<TData> extends BaseItem {
  type: 'chart';
  xField: string;
  yField: string;
  chartParams?: Record<string, any>;
}

interface CounterItem extends BaseItem {
  type: 'counter';
  value: number;
  // just example type for now
}

interface MapItem extends BaseItem {
  type: 'map';
  // details to be figured out later
}

type GenItem = ChartItem<any> | CounterItem | MapItem;

export type { GenItem, ChartItem, CounterItem, MapItem, ItemDataRef };
