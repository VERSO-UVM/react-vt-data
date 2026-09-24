import { Card, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { DataRow } from '@/types/cachedCharts';

// Census ACS poverty and uninsured rates over time for both places, from
// /load/acs5-db/timeseries/economics/poverty-uninsured (rows: year,
// Location, Variable, Percent). CDC PLACES health estimates are a single
// snapshot, so these show how the context changed. Each line is labeled
// with the place its rows describe, which for a town is the town itself
// (ACS publishes towns), even where the CDC charts show its county.

const SERIES = [
  { variable: 'Below poverty level', title: 'People below the poverty level' },
  { variable: 'No health insurance', title: 'People without health insurance' },
];

interface PovertyUninsuredTrendsProps {
  primary: DataRow[];
  comparison: DataRow[];
  primaryName: string;
  comparisonName: string;
}

function placeName(rows: DataRow[], fallback: string) {
  const name = rows.find((r) => r.Location)?.Location;
  return name ? String(name) : fallback;
}

function seriesFor(
  variable: string,
  primary: DataRow[],
  comparison: DataRow[],
) {
  const pick = (rows: DataRow[]) =>
    new Map(
      rows
        .filter((r) => r.Variable === variable)
        .map((r) => [Number(r.year), Number(r.Percent)]),
    );
  const p = pick(primary);
  const c = pick(comparison);
  const years = Array.from(new Set([...p.keys(), ...c.keys()])).sort(
    (a, b) => a - b,
  );
  return years.map((year) => ({
    year,
    primary: p.get(year) ?? null,
    comparison: c.get(year) ?? null,
  }));
}

export default function PovertyUninsuredTrends({
  primary,
  comparison,
  primaryName,
  comparisonName,
}: PovertyUninsuredTrendsProps) {
  const first = placeName(primary, primaryName);
  const second = placeName(comparison, comparisonName);
  const charts = SERIES.map((s) => ({
    ...s,
    data: seriesFor(s.variable, primary, comparison),
  })).filter((s) => s.data.length > 0);
  if (charts.length === 0) return null;

  return (
    <Card radius="xl" padding="lg" withBorder style={{ height: '100%' }}>
      <Stack gap={2} mb="md">
        <Title order={4}>Change Over Time</Title>
        <Text size="sm" c="dimmed">
          Census ACS 5-year estimates. The CDC health estimates on this page are
          a single snapshot; these show how poverty and insurance coverage
          changed around them.
        </Text>
      </Stack>
      <SimpleGrid cols={{ base: 1, md: charts.length }} spacing="xl">
        {charts.map((chart) => (
          <Stack key={chart.variable} gap="xs">
            <Text size="sm" fw={600}>
              {chart.title}
            </Text>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart
                data={chart.data}
                margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                <YAxis
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fontSize: 12 }}
                  domain={[0, 'auto']}
                />
                <Tooltip
                  formatter={(v: unknown) =>
                    v != null ? `${Number(v).toFixed(1)}%` : '—'
                  }
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="primary"
                  name={first}
                  stroke="#5474B4"
                  strokeWidth={2}
                  dot={false}
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="comparison"
                  name={second}
                  stroke="#c0c5cf"
                  strokeWidth={2}
                  dot={false}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </Stack>
        ))}
      </SimpleGrid>
    </Card>
  );
}
