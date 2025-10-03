type ChartItem = {
  lib: 'recharts' | 'other'; // which renderer to use
  type: string; // "line" | "bar" | etc.
  data: any; // the actual chart data
  options?: Record<string, any>; // extra settings
};

type CountItem = {
  count: number;
};

type GenItem =
  | { id: string; type: 'chart'; data: ChartItem }
  | { id: string; type: 'counter'; data: CountItem };

type ItemsContextType = {
  items: GenItem[];
  addItem: (item: GenItem) => void;
  removeItem: (id: string) => void;
  updateItem: (item: GenItem) => void;
};

export type { ChartItem, CountItem, GenItem, ItemsContextType };
