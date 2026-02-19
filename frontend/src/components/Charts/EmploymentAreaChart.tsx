'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartItem } from '@/types/cachedCharts';

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

export const EmploymentAreaChart = ({
  chart,
}: {
  chart: ChartItem<any>;
}) => {
  const data = chart.data as any[];
  if (!data?.length) return null;

  const sectors = Object.keys(data[0]).filter((k) => k !== 'quarter_label');

  // Show only Q1 ticks on x-axis to avoid crowding
  const q1Ticks = data
    .filter((d) => String(d.quarter_label).endsWith('Q1'))
    .map((d) => d.quarter_label);

  return (
    <>
      <ResponsiveContainer width="100%" height="100%">
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
    </>
  );

};
