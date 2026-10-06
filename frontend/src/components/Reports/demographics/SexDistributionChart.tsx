'use client';

import { Grid, Group, Stack, Text } from '@mantine/core';
import { PieChart, Pie, ResponsiveContainer, Tooltip } from 'recharts';
import { DataRow } from '@/types/cachedCharts';
import {
  COMPARISON_COLOR,
  ChartBlock,
  getValue,
  useReport,
} from '@/components/Reports/shared';

function SexDonut({
  title,
  rows,
  accent,
}: {
  title: string;
  rows: DataRow[];
  accent: string;
}) {
  const data = [
    {
      name: 'Female',
      value: getValue(rows, 'Female', 'Percent') ?? 0,
      fill: accent,
    },
    {
      name: 'Male',
      value: getValue(rows, 'Male', 'Percent') ?? 0,
      fill: COMPARISON_COLOR,
    },
  ];
  return (
    <Stack align="center" gap="xs">
      <Text fw={600}>{title}</Text>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart responsive>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="80%"
            outerRadius="100%"
            paddingAngle={2}
          />
          <Tooltip formatter={(value) => `${Number(value).toFixed(1)}%`} />
        </PieChart>
      </ResponsiveContainer>

      <Stack gap={2}>
        {data.map((item) => (
          <Group key={item.name} justify="space-between" w={140}>
            <Text size="sm">{item.name}</Text>
            <Text fw={700}>{item.value.toFixed(1)}%</Text>
          </Group>
        ))}
      </Stack>
    </Stack>
  );
}

export default function SexDistributionChart() {
  const { primary, comparison, accent } = useReport();
  return (
    <ChartBlock title="Sex Distribution">
      <Grid justify="space-around" align="flex-start">
        <Grid.Col span={6}>
          <SexDonut
            title={primary.name}
            rows={primary.current}
            accent={accent}
          />
        </Grid.Col>
        <Grid.Col span={6}>
          <SexDonut
            title={comparison.name}
            rows={comparison.current}
            accent={accent}
          />
        </Grid.Col>
      </Grid>
    </ChartBlock>
  );
}
