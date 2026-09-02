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

interface VacancyDistributionChartProps {
  primary: DataRow[];
  comparison: DataRow[];
  primaryName: string;
  comparisonName: string;
}

function getValue(data: DataRow[], variable: string): number {
  const row = data.find((d) => d.Variable === variable);
  return row ? Number(row.Percent) : 0;
}

function buildVacancyData(
  primary: DataRow[],
  comparison: DataRow[],
  primaryName: string,
  comparisonName: string,
) {
  return [
    {
      category: 'Own',
      [primaryName]: getValue(primary, 'Homeowner Vacancy Rate'),
      [comparisonName]: getValue(comparison, 'Homeowner Vacancy Rate'),
    },
    {
      category: 'Rent',
      [primaryName]: getValue(primary, 'Rental Vacancy Rate'),
      [comparisonName]: getValue(comparison, 'Rental Vacancy Rate'),
    },
  ];
}

export default function VacancyDistributionChart({
  primary,
  comparison,
  primaryName,
  comparisonName,
}: VacancyDistributionChartProps) {
  const data = buildVacancyData(
    primary,
    comparison,
    primaryName,
    comparisonName,
  );

  return (
    <Card
      radius="xl"
      padding="lg"
      withBorder
      style={{ transition: 'all 180ms ease' }}
    >
      <Title order={4} mb="md">
        Vacancy Distribution
      </Title>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis
            type="number"
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
          />
          <YAxis type="category" dataKey="category" width={120} />
          <Tooltip formatter={(value) => `${Number(value).toFixed(1)}%`} />
          <Legend />
          <Bar dataKey={primaryName} fill="#a73c00" radius={[0, 4, 4, 0]} />
          <Bar dataKey={comparisonName} fill="#c0c5cf" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
