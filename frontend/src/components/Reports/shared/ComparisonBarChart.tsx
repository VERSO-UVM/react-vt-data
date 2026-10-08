'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { DataRow } from '@/types/cachedCharts';
import { COMPARISON_COLOR } from './colors';
import { getValue } from './data';
import { useReport } from './ReportContext';
import { ChartBlock } from './Section';

type Category = string | { key: string; label: string };

/**
 * Primary vs benchmark bars over a fixed list of categories, read from the
 * current-year rows. Categories are looked up by `Variable` and `field`
 * unless `readValue` says otherwise. `horizontal` lays bars out left-to-right
 * with the labels down the side.
 */
export default function ComparisonBarChart({
  title,
  categories,
  field = 'Percent',
  readValue,
  horizontal = false,
  domain,
  height = 340,
  labelWidth = 150,
  tick = (v) => `${v}%`,
  tip = (v) => `${v.toFixed(1)}%`,
}: {
  title: string;
  categories: Category[];
  field?: string;
  readValue?: (rows: DataRow[], key: string) => number;
  horizontal?: boolean;
  domain?: [number, number];
  height?: number;
  labelWidth?: number;
  tick?: (v: number) => string;
  tip?: (v: number) => string;
}) {
  const { primary, comparison, accent, exporting } = useReport();
  const read =
    readValue ??
    ((rows: DataRow[], key: string) => getValue(rows, key, field) ?? 0);
  const data = categories.map((c) => {
    const { key, label } = typeof c === 'string' ? { key: c, label: c } : c;
    return {
      label,
      [primary.name]: read(primary.current, key),
      [comparison.name]: read(comparison.current, key),
    };
  });
  const gap = data
    .map((d) => ({
      label: String(d.label),
      p: Number(d[primary.name]),
      c: Number(d[comparison.name]),
    }))
    .sort((a, b) => Math.abs(b.p - b.c) - Math.abs(a.p - a.c))[0];
  const insight =
    gap && gap.p !== gap.c
      ? `Biggest gap: ${gap.label}, ${tip(gap.p)} in ${primary.name.replace(/, Vermont$/, '')} vs. ${tip(gap.c)} in ${comparison.name.replace(/, Vermont$/, '')}.`
      : undefined;
  const radius: [number, number, number, number] = horizontal
    ? [0, 4, 4, 0]
    : [4, 4, 0, 0];

  return (
    <ChartBlock title={title} insight={insight}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          layout={horizontal ? 'vertical' : 'horizontal'}
          margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            horizontal={!horizontal}
            vertical={horizontal}
          />
          {horizontal ? (
            <>
              <XAxis
                type="number"
                domain={domain}
                tickFormatter={(v) => tick(Number(v))}
                tick={{ fontSize: 12 }}
              />
              <YAxis
                type="category"
                dataKey="label"
                width={labelWidth}
                tick={{ fontSize: 12 }}
              />
            </>
          ) : (
            <>
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis
                domain={domain}
                tickFormatter={(v) => tick(Number(v))}
                tick={{ fontSize: 12 }}
              />
            </>
          )}
          <Tooltip formatter={(v) => tip(Number(v))} />
          <Legend />
          <Bar
            isAnimationActive={!exporting}
            dataKey={primary.name}
            fill={accent}
            radius={radius}
          />
          <Bar
            isAnimationActive={!exporting}
            dataKey={comparison.name}
            fill={COMPARISON_COLOR}
            radius={radius}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartBlock>
  );
}
