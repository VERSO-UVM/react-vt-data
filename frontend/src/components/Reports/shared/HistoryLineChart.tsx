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
  const { timeseries, primary, comparison, accent, exporting } = useReport();
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

  // "Burlington grew 45% since 2010 (South Burlington: 38%)."
  const change = (key: string) => {
    const pts = data.filter((d) => Number(d[key]) > 0);
    if (pts.length < 2) return null;
    const first = pts[0];
    const last = pts[pts.length - 1];
    return {
      from: first.year,
      pct:
        ((Number(last[key]) - Number(first[key])) / Number(first[key])) * 100,
    };
  };
  const pc = change(primary.name);
  const cc = change(comparison.name);
  const verb = (n: number) => (n >= 0 ? 'grew' : 'fell');
  const short = (n: string) => n.replace(/, Vermont$/, '');
  const insight = pc
    ? `${short(primary.name)} ${verb(pc.pct)} ${Math.abs(pc.pct).toFixed(0)}% since ${pc.from}` +
      (cc
        ? ` (${short(comparison.name)}: ${cc.pct >= 0 ? '+' : '-'}${Math.abs(cc.pct).toFixed(0)}%).`
        : '.')
    : undefined;

  return (
    <ChartBlock title={title} insight={insight}>
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
            isAnimationActive={!exporting}
            type="monotone"
            dataKey={primary.name}
            stroke={accent}
            strokeWidth={2.5}
            dot={false}
          />
          <Line
            isAnimationActive={!exporting}
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
