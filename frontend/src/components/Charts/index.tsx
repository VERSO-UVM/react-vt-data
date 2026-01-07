export { default as DualLine } from './DualLine';
export {
  SamePerXBarChart,
  DiffPerXBarChart,
  CompareDiffPerXBarChart,
} from './Bar';

import { ChartItem } from '@/types/cachedCharts';
import {
  Card,
  Box,
  Title,
  Stack,
  Text,
  Group,
  SegmentedControl,
} from '@mantine/core';
import { AddChart, RemoveChart } from './saving';
import { useState } from 'react';
import { TableView, ViewSwitch } from './TableView';

// ChartCard
interface ChartCardProps<TData> {
  chart: ChartItem<TData>;
  ChartComponent: React.FC<{ chart: ChartItem<TData> }>;
  action?: 'add' | 'remove';
}
export const ChartCard = <TData,>({
  // ideally this will eventually have multiple 'views' in to the same data
  // tabular, visual, and textual summary.
  chart,
  ChartComponent,
  action = 'add',
}: ChartCardProps<TData>) => {
  const [view, setView] = useState<'chart' | 'table'>('chart');

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Box mb="xl" style={{ height: 400, padding: '16px' }}>
        <Title order={4}>
          {chart.description ? ` ${chart.description} for ` : ''}
          {chart.title}
        </Title>
        <ViewSwitch view={view} setView={setView} />
        {view === 'chart' ? (
          <ChartComponent chart={chart} />
        ) : (
          <TableView chart={chart} />
        )}
      </Box>
      <Text size="sm" c="gray.6" mt="md" ta="right">
        {chart.metadata.source}
        {/* TODO: Come up with a more reasonable way to show metadata */}
      </Text>
      <Group mt="md">
        {action === 'add' ? (
          <AddChart chart={chart} />
        ) : (
          <RemoveChart chart={chart} />
        )}
      </Group>
    </Card>
  );
};

interface ChartStackProps<TData> {
  charts: ChartItem<TData>[];
  action?: 'add' | 'remove';
}

import * as allCharts from './index'; // self-import to dynamically access all exports

export const ChartStack = <TData,>({
  charts,
  action = 'add',
}: ChartStackProps<TData>) => (
  <Stack>
    {charts.map((chart) => {
      const ChartComponent = allCharts[
        chart.subtype as keyof typeof allCharts
      ] as React.FC<{ chart: ChartItem<TData> }>;
      if (!ChartComponent) return null;
      if (!chart.data || chart.data.length === 0)
        return (
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Text>
              No data available from {`${chart.title}`}
              {chart.description ? ` for ${chart.description}` : ''}.
            </Text>
          </Card>
        );
      return (
        <ChartCard
          key={chart.id}
          chart={chart}
          action={action}
          ChartComponent={ChartComponent}
        />
      );
    })}
  </Stack>
);
