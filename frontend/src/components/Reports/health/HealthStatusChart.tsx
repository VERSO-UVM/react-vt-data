import { Card, Title } from '@mantine/core';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { DataRow } from '@/types/cachedCharts';

interface HealthStatusChartProps {
  primary: DataRow[];
  comparison: DataRow[];
  primaryName: string;
  comparisonName: string;
}

// Short axis labels for the "Health Status" category measures.
const MEASURES: { label: string; measure: string }[] = [
  {
    label: 'Fair or Poor Health',
    measure: 'Fair or poor self-rated health status among adults',
  },
  {
    label: 'Mental Distress',
    measure: 'Frequent mental distress among adults',
  },
  {
    label: 'Physical Distress',
    measure: 'Frequent physical distress among adults',
  },
];

function getValue(data: DataRow[], measure: string): number {
  const row = data.find((d) => d.Measure === measure);
  return row ? Number(row.Value) : 0;
}

function buildData(primary: DataRow[], comparison: DataRow[]) {
  return MEASURES.map(({ label, measure }) => ({
    label,
    primary: getValue(primary, measure),
    comparison: getValue(comparison, measure),
  }));
}

export default function HealthStatusChart({
  primary,
  comparison,
  primaryName,
  comparisonName,
}: HealthStatusChartProps) {
  const data = buildData(primary, comparison);

  return (
    <Card
      radius="xl"
      padding="lg"
      withBorder
      style={{ height: '100%', transition: 'all 180ms ease' }}
    >
      <Title order={4} mb="md">
        Self-Reported Health Status
      </Title>

      <ResponsiveContainer width="100%" height={380}>
        <BarChart
          data={data}
          margin={{ top: 10, right: 20, left: 20, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 12 }} />
          <Tooltip formatter={(v: unknown) => `${Number(v).toFixed(1)}%`} />
          <Legend />
          <Bar
            dataKey="primary"
            name={primaryName}
            fill="#5474B4"
            radius={[6, 6, 0, 0]}
          />
          <Bar
            dataKey="comparison"
            name={comparisonName}
            fill="#c0c5cf"
            radius={[6, 6, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
