import { Card, Title } from '@mantine/core';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { DataRow } from '@/types/cachedCharts';

interface TotalHousingUnitsHistoryChartProps {
  primary: DataRow[];
  comparison: DataRow[];
  primaryName: string;
  comparisonName: string;
}

function buildSeries(
  primary: DataRow[],
  comparison: DataRow[],
  primaryName: string,
  comparisonName: string,
) {
  const years = Array.from(
    new Set(
      [...primary, ...comparison]
        .map((r) => Number(r.year))
        .filter((y) => Number.isFinite(y)),
    ),
  ).sort((a, b) => a - b);

  return years.map((year) => ({
    year,
    [primaryName]:
      primary.find((r) => Number(r.year) === year)?.Total_Housing_Units ?? null,
    [comparisonName]:
      comparison.find((r) => Number(r.year) === year)?.Total_Housing_Units ??
      null,
  }));
}

export default function TotalHousingUnitsHistoryChart({
  primary,
  comparison,
  primaryName,
  comparisonName,
}: TotalHousingUnitsHistoryChartProps) {
  const data = buildSeries(primary, comparison, primaryName, comparisonName);

  if (data.length === 0) return null;

  return (
    <Card
      radius="xl"
      padding="lg"
      withBorder
      style={{ height: '100%', transition: 'all 180ms ease' }}
    >
      <Title order={4} mb="md">
        Total Housing Units Over Time
      </Title>

      <ResponsiveContainer width="100%" height={320}>
        <LineChart
          data={data}
          margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="year" tick={{ fontSize: 12 }} />
          <YAxis
            tickFormatter={(v) => Number(v).toLocaleString()}
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            formatter={(v: unknown) =>
              v != null ? Number(v).toLocaleString() : '—'
            }
          />
          <Legend />
          <Line
            type="monotone"
            dataKey={primaryName}
            stroke="#5474B4"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey={comparisonName}
            stroke="#c0c5cf"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}
