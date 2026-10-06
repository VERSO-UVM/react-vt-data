'use client';

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
import { COMPARISON_COLOR } from './colors';
import { FORMATS, type FormatKey } from './data';
import { useReport } from './ReportContext';
import { ChartBlock } from './Section';

/**
 * Primary vs benchmark over time, from the `timeseries[source]` table the
 * topic's SECTIONS config fetched. `field` is the column holding the value.
 */
export default function HistoryLineChart({
  source,
  field,
  title,
  format,
}: {
  source: string;
  field: string;
  title: string;
  format: FormatKey;
}) {
  const { timeseries, primary, comparison, accent } = useReport();
  const ts = timeseries?.[source];
  if (!ts) return null;

  const years = Array.from(
    new Set(
      [...ts.primary, ...ts.comparison]
        .map((r) => Number(r.year))
        .filter((y) => Number.isFinite(y)),
    ),
  ).sort((a, b) => a - b);
  if (years.length === 0) return null;

  const at = (rows: typeof ts.primary, year: number) =>
    rows.find((r) => Number(r.year) === year)?.[field] ?? null;
  const data = years.map((year) => ({
    year,
    [primary.name]: at(ts.primary, year),
    [comparison.name]: at(ts.comparison, year),
  }));
  const f = FORMATS[format];

  return (
    <ChartBlock title={title}>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={data}
          margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="year" tick={{ fontSize: 12 }} />
          <YAxis
            tickFormatter={(v) => f.tick(Number(v))}
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            formatter={(v: unknown) => (v != null ? f.value(Number(v)) : '—')}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey={primary.name}
            stroke={accent}
            strokeWidth={2.5}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey={comparison.name}
            stroke={COMPARISON_COLOR}
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartBlock>
  );
}
