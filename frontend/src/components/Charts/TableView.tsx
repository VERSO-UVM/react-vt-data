// TableView.tsx

import { ChartItem } from '@/types/cachedCharts';
import { Table } from '@mantine/core';
import { Group, Title, SegmentedControl, ScrollArea } from '@mantine/core';

interface TableViewProps<TData> {
  chart: ChartItem<TData>;
}

export const TableView = <TData extends Record<string, any>>({
  chart,
}: TableViewProps<TData>) => {
  const rows = (chart.tableData || chart.data) as TData[];

  if (!rows || rows.length === 0) return null;

  // start with show cols, fall back to x and y field provided they're in there.
  const columns =
    chart.showCols?.filter((c) => c.visible ?? true) ??
    (rows[0] ? [chart.xField, chart.yField].filter((k) => k in rows[0]) : []);

  return (
    <Table>
      <Table.Thead>
        <Table.Tr>
          {columns.map((col) =>
            typeof col === 'string' ? (
              <Table.Th key={col}>{col}</Table.Th>
            ) : (
              <Table.Th key={col.key}>{col.label ?? col.key}</Table.Th>
            ),
          )}
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {rows.map((row, i) => (
          <Table.Tr key={i}>
            {columns.map((col) => {
              const key = typeof col === 'string' ? col : col.key;
              return <Table.Td key={key}>{String(row[key])}</Table.Td>;
            })}
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
};

interface ViewSwitchProps {
  view: 'chart' | 'table';
  setView: (view: 'chart' | 'table') => void;
}

export const ViewSwitch = ({ view, setView }: ViewSwitchProps) => (
  <Group justify="space-between" mb="sm">
    <Title order={4}></Title>
    <SegmentedControl
      value={view}
      defaultValue='chart'
      transitionDuration={300}
      transitionTimingFunction="linear"
      onChange={(v) => setView(v as 'chart' | 'table')}
      data={[
        { label: 'Chart', value: 'chart' },
        { label: 'Table', value: 'table' },
      ]}
    />
  </Group>
);
