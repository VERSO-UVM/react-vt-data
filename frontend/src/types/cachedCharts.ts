interface BaseItem<TData = any> {
  id: string;
  title: string;
  type: 'chart' | 'counter' | 'map' | string;
  createdAt?: string;
  dataRef?: ItemDataRef;
  data: TData[];
}

interface ItemDataRef {
  datasetId: string;
  filters?: Record<string, any>;
  params?: Record<string, any>;
}

interface TableColumnConfig {
  key: string;
  label?: string; // optional nicer display name
  visible?: boolean; // client-side filtering
}

interface ChartItem<TData> extends BaseItem<TData> {
  type: 'chart';
  subtype: string;
  trendChart?: string; // component name for the trend view of table-primary items
  xField: string;
  yField: string;
  data: TData[];
  tableData?: TData[];
  showCols?: TableColumnConfig[];
  chartParams?: Record<string, any>;
  description?: string;
  compareData?: TData[];
  notes?: string;
  metadata?: Record<string, any>;
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

export type {
  GenItem,
  ChartItem,
  CounterItem,
  MapItem,
  ItemDataRef,
  TableColumnConfig,
};
