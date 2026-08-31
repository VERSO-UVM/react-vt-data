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

interface AgeDistributionChartProps {
  primary: DataRow[];
  comparison: DataRow[];
  primaryName: string;
  comparisonName: string;
}

const AGE_GROUPS = [
  'Under 18',
  '18 to 24',
  '25 to 34',
  '35 to 44',
  '45 to 54',
  '55 to 64',
  '65 to 74',
  '75 Plus',
];

function getValue(data: DataRow[], variable: string): number {
  const row = data.find((d) => d.Variable === variable);
  return row ? Number(row.Percent) : 0;
}

function buildAgeData(
  primary: DataRow[],
  comparison: DataRow[],
  primaryName: string,
  comparisonName: string,
) {
  return AGE_GROUPS.map((age) => ({
    age,
    [primaryName]: getValue(primary, age),
    [comparisonName]: getValue(comparison, age),
  }));
}

export default function AgeDistributionChart({
  primary,
  comparison,
  primaryName,
  comparisonName,
}: AgeDistributionChartProps) {
  const data = buildAgeData(primary, comparison, primaryName, comparisonName);

  return (
    <Card
      radius="xl"
      padding="lg"
      withBorder
      style={{
        height: '100%',
        transition: 'all 180ms ease',
      }}
    >
      <Title order={4} mb="md">
        Age Distribution
      </Title>

      <ResponsiveContainer width="100%" height={380}>
        <BarChart
          data={data}
          margin={{
            top: 10,
            right: 20,
            left: 20,
            bottom: 10,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="age" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={(value) => `${value}%`} />
          <Tooltip formatter={(value) => `${Number(value).toFixed(1)}%`} />
          <Legend />
          <Bar dataKey={primaryName} fill="#4F8EF7" radius={[6, 6, 0, 0]} />
          <Bar dataKey={comparisonName} fill="#A78BFA" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
