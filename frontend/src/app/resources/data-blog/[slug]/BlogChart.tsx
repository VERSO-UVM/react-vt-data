'use client';

import { Box, Text } from '@mantine/core';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { COLORS, FONTS } from '@/app/theme';

// One entry in a blog's content/<slug>/charts.json
export type BlogChartSpec = {
  type: 'line' | 'bar';
  title: string;
  subtitle?: string;
  source: string;
  x: string;
  series: { key: string; label?: string; color?: string }[];
  data: Record<string, string | number>[];
  unit?: string;
};

const PALETTE = [COLORS.spruce, COLORS.amber, COLORS.slate, COLORS.red];

export function BlogChart({ spec }: { spec: BlogChartSpec }) {
  const fmt = (v: unknown) =>
    typeof v === 'number' ? `${v.toLocaleString()}${spec.unit ?? ''}` : `${v}`;
  const series = spec.series.map((s, i) => ({
    ...s,
    name: s.label ?? s.key,
    color: s.color ?? PALETTE[i % PALETTE.length],
  }));
  const common = {
    grid: <CartesianGrid stroke={COLORS.line} />,
    tooltip: <Tooltip formatter={fmt} />,
    legend: series.length > 1 ? <Legend /> : null,
  };

  return (
    <Box
      component="figure"
      my={40}
      mx={0}
      p="lg"
      style={{
        border: `1px solid ${COLORS.line}`,
        borderRadius: 12,
        background: '#fff',
      }}
    >
      <Text fw={600} style={{ fontFamily: FONTS.display, fontSize: 18 }}>
        {spec.title}
      </Text>
      {spec.subtitle && (
        <Text size="sm" c={COLORS.slate}>
          {spec.subtitle}
        </Text>
      )}

      <Box
        mt="md"
        // Horizontal bars so town/county names stay readable
        h={spec.type === 'bar' ? spec.data.length * 28 + 60 : 340}
      >
        <ResponsiveContainer width="100%" height="100%">
          {spec.type === 'line' ? (
            <LineChart data={spec.data}>
              {common.grid}
              <XAxis dataKey={spec.x} />
              <YAxis tickFormatter={fmt} width={60} />
              {common.tooltip}
              {common.legend}
              {series.map((s) => (
                <Line
                  key={s.key}
                  dataKey={s.key}
                  name={s.name}
                  stroke={s.color}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          ) : (
            <BarChart data={spec.data} layout="vertical">
              {common.grid}
              <XAxis type="number" tickFormatter={fmt} />
              <YAxis type="category" dataKey={spec.x} width={110} />
              {common.tooltip}
              {common.legend}
              {series.map((s) => (
                <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </Box>

      <Text
        component="figcaption"
        mt="sm"
        style={{ fontFamily: FONTS.mono, fontSize: 11, color: COLORS.slate }}
      >
        Source: {spec.source}
      </Text>
    </Box>
  );
}
