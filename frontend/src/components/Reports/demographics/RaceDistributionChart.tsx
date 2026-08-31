import { Card, Title } from '@mantine/core';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { DataRow } from '@/types/cachedCharts';

interface RaceDistributionChartProps {
  primary: DataRow[];
  comparison: DataRow[];
  primaryName: string;
  comparisonName: string;
}

const RACE_CATEGORIES = [
  'White',
  'Black or African American',
  'American Indian and Alaska Native',
  'Asian',
  'Native Hawaiian and Other Pacific Islander',
  'Some other race',
  'Two or more races',
  'Hispanic or Latino (of any race)',
];
2;

function getValue(data: DataRow[], variable: string): number {
  const row = data.find((d) => d.Variable === variable);
  return row ? Number(row.Percent) : 0;
}

function buildRaceData(
  primary: DataRow[],
  comparison: DataRow[],
  primaryName: string,
  comparisonName: string,
) {
  return RACE_CATEGORIES.map((race) => ({
    race,
    [primaryName]: getValue(primary, race),
    [comparisonName]: getValue(comparison, race),
  }));
}

export default function RaceDistributionChart({
  primary,
  comparison,
  primaryName,
  comparisonName,
}: RaceDistributionChartProps) {
  const data = buildRaceData(primary, comparison, primaryName, comparisonName);

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
        Race Distribution (%)
      </Title>

      <ResponsiveContainer width="100%" height={420}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{
            left: 20,
            right: 20,
          }}
          responsive
        >
          <CartesianGrid strokeDasharray="3 3" />

          <XAxis type="number" tickFormatter={(v) => `${v}%`} />

          <YAxis
            type="category"
            dataKey="race"
            width={180}
            tick={{ fontSize: 12 }}
          />

          <Tooltip formatter={(value) => `${Number(value).toFixed(1)}%`} />

          <Legend />

          <Bar dataKey={primaryName} fill="#4F8EF7" radius={[0, 6, 6, 0]} />

          <Bar dataKey={comparisonName} fill="#A78BFA" radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
