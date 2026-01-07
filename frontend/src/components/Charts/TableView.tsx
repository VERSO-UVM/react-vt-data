// TableView.tsx

import { ChartItem } from '@/types/cachedCharts';
import { Table } from '@mantine/core';
import { Group, Title, SegmentedControl } from '@mantine/core';

interface TableViewProps<TData> {
  chart: ChartItem<TData>;
}

export const TableView = <TData,>({ chart }: TableViewProps<TData>) => (
  <Table>
    <Table.Thead>
      <Table.Tr>
        <Table.Th>{chart.xField}</Table.Th>
        <Table.Th>{chart.yField}</Table.Th>
      </Table.Tr>
    </Table.Thead>
    <Table.Tbody>
      {chart.data.map((row, i) => (
        <Table.Tr key={i}>
          <Table.Td>{row[chart.xField]}</Table.Td>
          <Table.Td>{row[chart.yField]}</Table.Td>
        </Table.Tr>
      ))}
    </Table.Tbody>
  </Table>
);

interface ViewSwitchProps {
  view: 'chart' | 'table';
  setView: (view: 'chart' | 'table') => void;
}

export const ViewSwitch = ({ view, setView }: ViewSwitchProps) => (
  <Group justify="space-between" mb="sm">
    <Title order={4}></Title>
    <SegmentedControl
      value={view}
      onChange={(v) => setView(v as 'chart' | 'table')}
      data={[
        { label: 'Chart', value: 'chart' },
        { label: 'Table', value: 'table' },
      ]}
    />
  </Group>
);
