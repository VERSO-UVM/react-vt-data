// charts/index.ts
import DualLine from './DualLine';
import { SamePerXBarChart, DiffPerXBarChart } from './Bar';
import { ChartItem } from '@/types/cachedCharts';
import { Card, Box, Title, Stack } from '@mantine/core';
import { AddChart, RemoveChart } from './saving';

const chartComponents: Record<string, React.FC<{ chart: any }>> = {
  DualLine: DualLine,
  SameXBar: SamePerXBarChart,
  DiffXBar: DiffPerXBarChart,
};

interface ChartCardProps<TData> {
  chart: ChartItem<TData>;
  ChartComponent: React.FC<{ chart: ChartItem<TData> }>;
  action?: 'add' | 'remove';
}

const ChartCard = <TData,>({
  chart,
  ChartComponent,
  action = 'add',
}: ChartCardProps<TData>) => (
  <Card shadow="sm" padding="lg" radius="md" withBorder>
    <Box mb="xl" style={{ height: 400, padding: '16px' }}>
      <Title order={4}>{chart.title}</Title>
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

const ChartStack = <TData,>({
  charts,
  action = 'add',
}: ChartStackProps<TData>) => (
  <Stack>
    {charts.map((chart) => {
      const ChartComponent = chartComponents[chart.subtype];
      if (!ChartComponent) return null;
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

export default ChartStack;
