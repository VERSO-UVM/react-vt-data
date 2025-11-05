export { default as DualLine } from './DualLine';
export {
  SamePerXBarChart,
  DiffPerXBarChart,
  CompareDiffPerXBarChart,
} from './Bar';

import { ChartItem } from '@/types/cachedCharts';
import { Card, Box, Title, Stack, Text } from '@mantine/core';
import { AddChart, RemoveChart } from './saving';

// ChartCard
interface ChartCardProps<TData> {
  chart: ChartItem<TData>;
  ChartComponent: React.FC<{ chart: ChartItem<TData> }>;
  action?: 'add' | 'remove';
}
export const ChartCard = <TData,>({
  // ideally htis will eventually have multiple 'views' in to the same data
  // tabular, visual, and textual summary.
  chart,
  ChartComponent,
  action = 'add',
}: ChartCardProps<TData>) => (
  <Card shadow="sm" padding="lg" radius="md" withBorder>
    <Box mb="xl" style={{ height: 400, padding: '16px' }}>
      <Title order={4}>
        {chart.description ? ` ${chart.description} for ` : ''}
        {chart.title}
      </Title>
      <ChartComponent chart={chart} />
    </Box>
    {action === 'add' ? (
      <AddChart chart={chart} />
    ) : (
      <RemoveChart chart={chart} />
    )}
  </Card>
);

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
