// one cell of backend-provided chart/table data
type Cell = string | number | boolean | null | undefined;
// one row of chart/table data: column name -> cell value
type DataRow = Record<string, Cell>;

// chart configuration knobs consumed by the chart components; open-ended so
// chart-specific extras can ride along
interface ChartParams {
  color?: string;
  colorScheme?: string;
  datakey?: string;
  datakeys?: [string, string][];
  defId?: string;
  fixedYear?: number;
  legendLabels?: string[];
  noViewSwitch?: boolean;
  xInterval?: number;
  xAngle?: number;
  xHeight?: number;
  [key: string]: unknown;
}

interface ChartMetadata {
  source?: string;
  [key: string]: unknown;
}

interface BaseItem<TData = DataRow> {
  id: string;
  title: string;
  type: 'chart' | 'counter' | 'map' | string;
  createdAt?: string;
  dataRef?: ItemDataRef;
  data: TData[];
}

interface ItemDataRef {
  datasetId: string;
  filters?: Record<string, unknown>;
  params?: Record<string, unknown>;
}

interface TableColumnConfig {
  key: string;
  label?: string; // optional nicer display name
  visible?: boolean; // client-side filtering
}

type ChartPayload = {
  data: DataRow[];
  metadata?: ChartMetadata;
  tableData?: DataRow[];
};

interface ChartItem<TData = DataRow> extends BaseItem<TData> {
  type: 'chart';
  subtype: string;
  trendChart?: string; // component name for the trend view of table-primary items
  categories?: string[]; // topic areas for interest-based filtering
  xField: string;
  yField: string;
  data: TData[];
  tableData?: TData[];
  showCols?: TableColumnConfig[];
  chartParams?: ChartParams;
  description?: string;
  compareData?: TData[];
  notes?: string;
  metadata?: ChartMetadata;
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

type GenItem = ChartItem<DataRow> | CounterItem | MapItem;

export type {
  Cell,
  DataRow,
  ChartParams,
  ChartMetadata,
  GenItem,
  ChartItem,
  CounterItem,
  MapItem,
  ItemDataRef,
  TableColumnConfig,
  ChartPayload,
};
