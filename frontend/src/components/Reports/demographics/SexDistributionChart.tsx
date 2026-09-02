import { Card, Grid, Group, Stack, Text, Title } from '@mantine/core';
import { PieChart, Pie, ResponsiveContainer, Tooltip } from 'recharts';
import { DataRow } from '@/types/cachedCharts';

interface SexDistributionChartProps {
  primary: DataRow[];
  comparison: DataRow[];
  primaryName: string;
  comparisonName: string;
}

function getValue(data: DataRow[], variable: string): number {
  const row = data.find((d) => d.Variable === variable);

  return row ? Number(row.Percent) : 0;
}

function buildSexData(data: DataRow[]) {
  return [
    {
      name: 'Female',
      value: getValue(data, 'Female'),
      fill: '#5474B4',
    },
    {
      name: 'Male',
      value: getValue(data, 'Male'),
      fill: '#c0c5cf',
    },
  ];
}

function SexDonut({
  title,
  data,
}: {
  title: string;
  data: {
    name: string;
    value: number;
  }[];
}) {
  return (
    <Stack align="center" gap="xs">
      <Text fw={600}>{title}</Text>
      <ResponsiveContainer width="100%" height={250}>
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

export default function SexDistributionChart({
  primary,
  comparison,
  primaryName,
  comparisonName,
}: SexDistributionChartProps) {
  const primarySex = buildSexData(primary);
  const comparisonSex = buildSexData(comparison);

  return (
    <Card
      radius="xl"
      padding="lg"
      withBorder
      style={{ transition: 'all 180ms ease' }}
    >
      <Title order={4} mb="md">
        Sex Distribution
      </Title>

      <Grid justify="space-around" align="flex-start">
        <Grid.Col span={6}>
          <SexDonut title={primaryName} data={primarySex} />
        </Grid.Col>
        <Grid.Col span={6}>
          <SexDonut title={comparisonName} data={comparisonSex} />
        </Grid.Col>
      </Grid>
    </Card>
  );
}
