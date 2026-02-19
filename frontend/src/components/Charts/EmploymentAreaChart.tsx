'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartItem } from '@/types/cachedCharts';
import { ScrollArea, SegmentedControl, Table } from '@mantine/core';
import { useState } from 'react';

// Stacking order should match SECTOR_ORDER in post_qcew.py
const SECTOR_COLORS: Record<string, string> = {
  'Goods-producing': '#4472c4',
  'Trade, Transportation & Utilities': '#ed7d31',
  'Education & Health Services': '#70ad47',
  'Leisure & Hospitality': '#5b9bd5',
  'Professional & Business Services': '#ffc000',
  'Information & Financial Activities': '#9e480e',
  Government: '#636363',
  'Other Services': '#c0c0c0',
};

const fmt = (v: any) =>
  v != null && !isNaN(v) ? Number(v).toLocaleString() : '—';

type EmpView = 'stacked' | 'trend' | 'table';

// Inner chart height after the SegmentedControl (~32px + 8px mb) takes space
const INNER_H = 345;

export const EmploymentAreaChart = ({ chart }: { chart: ChartItem<any> }) => {
  const [view, setView] = useState<EmpView>('stacked');
  const data = chart.data as any[];
  if (!data?.length) return null;

  const sectors = Object.keys(data[0]).filter((k) => k !== 'quarter_label');

  // Show only Q1 ticks on x-axis to avoid crowding
  const q1Ticks = data
    .filter((d) => String(d.quarter_label).endsWith('Q1'))
    .map((d) => d.quarter_label);

  // Augment each row with a computed Total (sum of all sector 4QMA values).
  // Because moving average is linear, sum(4QMA_i) == 4QMA(sum_i), so this is
  // exact unless some sectors have suppressed (NaN) values.
  const dataWithTotal = data.map((row) => ({
    ...row,
    Total: sectors.reduce((sum, s) => {
      const v = row[s];
      return v != null && !isNaN(v) ? sum + Number(v) : sum;
    }, 0),
  }));

  // Nice round Y-axis bounds for trend view.
  // Step is chosen so there are ~5 ticks across the data range; the bottom is
  // one step below the data min and the top is rounded up to the next step.
  // e.g. min=11262, max=15086 → step=1000 → domain [10000, 16000]
  const totals = dataWithTotal
    .map((r) => r.Total as number)
    .filter((v) => v > 0);
  const minTotal = totals.length ? Math.min(...totals) : 0;
  const maxTotal = totals.length ? Math.max(...totals) : 0;
  const range = maxTotal - minTotal || 1;
  const rough = range / 5;
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  const norm = rough / mag;
  const step =
    norm < 1.5 ? mag : norm < 3 ? 2 * mag : norm < 7 ? 5 * mag : 10 * mag;
  const trendYMin = (Math.floor(minTotal / step) - 1) * step;
  const trendYMax = Math.ceil(maxTotal / step) * step;

  // Table rows newest-first
  const tableRows = [...dataWithTotal].reverse();

  return (
    <>
      <SegmentedControl
        value={view}
        onChange={(v) => setView(v as EmpView)}
        data={[
          { label: 'Stacked', value: 'stacked' },
          { label: 'Trend', value: 'trend' },
          { label: 'Table', value: 'table' },
        ]}
        size="xs"
        mb="sm"
      />

      {view === 'stacked' && (
        <ResponsiveContainer width="100%" height={INNER_H}>
          <AreaChart
            data={data}
            margin={{ top: 10, right: 20, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e0d8cc" />
            <XAxis
              dataKey="quarter_label"
              ticks={q1Ticks}
              tick={{ fontSize: 11 }}
              interval={0}
            />
            <YAxis
              tickFormatter={fmt}
              tick={{ fontSize: 11 }}
              width={65}
              label={{
                value: 'Employment',
                angle: -90,
                position: 'insideLeft',
                offset: -5,
                style: { fontSize: 11 },
              }}
            />
            <Tooltip
              formatter={(val: any, name: string) => [fmt(val), name]}
              labelFormatter={(label) => `Quarter: ${label}`}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {sectors.map((s) => (
              <Area
                key={s}
                type="monotone"
                dataKey={s}
                stackId="1"
                fill={SECTOR_COLORS[s] ?? '#aaa'}
                stroke={SECTOR_COLORS[s] ?? '#aaa'}
                fillOpacity={0.85}
                dot={false}
                activeDot={false}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      )}

      {view === 'trend' && (
        <ResponsiveContainer width="100%" height={INNER_H}>
          <LineChart
            data={dataWithTotal}
            margin={{ top: 10, right: 20, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e0d8cc" />
            <XAxis
              dataKey="quarter_label"
              ticks={q1Ticks}
              tick={{ fontSize: 11 }}
              interval={0}
            />
            <YAxis
              tickFormatter={fmt}
              tick={{ fontSize: 11 }}
              width={65}
              domain={[trendYMin, trendYMax]}
              label={{
                value: 'Employment',
                angle: -90,
                position: 'insideLeft',
                offset: -5,
                style: { fontSize: 11 },
              }}
            />
            <Tooltip
              formatter={(val: any, name: string) => [fmt(val), name]}
              labelFormatter={(label) => `Quarter: ${label}`}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line
              type="monotone"
              dataKey="Total"
              stroke="#154734"
              strokeWidth={2.5}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}

      {view === 'table' && (
        <ScrollArea style={{ height: INNER_H }}>
          <Table striped highlightOnHover withColumnBorders fz="xs">
            <Table.Thead
              style={{
                position: 'sticky',
                top: 0,
                background: 'white',
                zIndex: 1,
              }}
            >
              <Table.Tr>
                <Table.Th>Quarter</Table.Th>
                {sectors.map((s) => (
                  <Table.Th key={s} style={{ textAlign: 'right' }}>
                    {s}
                  </Table.Th>
                ))}
                <Table.Th style={{ textAlign: 'right' }}>Total</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {tableRows.map((row) => (
                <Table.Tr key={row.quarter_label}>
                  <Table.Td>{row.quarter_label}</Table.Td>
                  {sectors.map((s) => (
                    <Table.Td key={s} style={{ textAlign: 'right' }}>
                      {fmt(row[s])}
                    </Table.Td>
                  ))}
                  <Table.Td style={{ textAlign: 'right', fontWeight: 600 }}>
                    {fmt(row.Total)}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      )}
    </>
  );
};
