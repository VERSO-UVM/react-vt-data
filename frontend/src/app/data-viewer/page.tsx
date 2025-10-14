'use client';

import { Stack, Card, Container, Box, Title } from '@mantine/core';
import DualLine from '@/components/Charts/DualLine';
import { AddChart } from '@/components/Charts/saving';
import { createChartItem } from '@/utils/itemFactory';

const data1: any[] = [
  { name: 'Page A', uv: 4000, pv: 2400, amt: 2400 },
  { name: 'Page B', uv: 3000, pv: 1398, amt: 2210 },
  { name: 'Page C', uv: 2000, pv: 9800, amt: 2290 },
  { name: 'Page D', uv: 2780, pv: 3908, amt: 2000 },
  { name: 'Page E', uv: 1890, pv: 4800, amt: 2181 },
  { name: 'Page F', uv: 2390, pv: 3800, amt: 2500 },
  { name: 'Page G', uv: 3490, pv: 4300, amt: 2100 },
];

const data2: any[] = [
  { name: 'Page A', uv: 1234, pv: 1110, amt: 2420 },
  { name: 'Page B', uv: 3100, pv: 1398, amt: 2410 },
  { name: 'Page C', uv: 2550, pv: 500, amt: 2590 },
  { name: 'Page D', uv: 2050, pv: 3908, amt: 2500 },
  { name: 'Page E', uv: 1120, pv: 4560, amt: 2381 },
  { name: 'Page F', uv: 2540, pv: 3800, amt: 2900 },
  { name: 'Page G', uv: 3350, pv: 4120, amt: 1100 },
];

const chart = createChartItem({
  title: 'Simple Time Series',
  xField: 'name',
  yField: 'uv',
  data: data1,
  chartParams: {
    datakey: 'pv',
  },
});

const chart2 = createChartItem({
  title: 'Simple Time Series 2',
  xField: 'name',
  yField: 'uv',
  data: data2,
  chartParams: {
    datakey: 'pv',
  },
});
export default function DataViewerPage() {
  return (
    <Container>
      <Stack>
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Box style={{ height: 400 }} mb="xl">
            <Title order={4}>{chart.title}</Title>
            <DualLine chart={chart} />
            <AddChart chart={chart} />
          </Box>
        </Card>
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Box style={{ height: 400 }} mb="xl">
            <Title order={4}>{chart2.title}</Title>
            <DualLine chart={chart2} />
            <AddChart chart={chart2} />
          </Box>
        </Card>
      </Stack>
    </Container>
  );
}
