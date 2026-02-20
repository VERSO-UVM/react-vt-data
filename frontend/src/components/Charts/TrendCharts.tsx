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
import { ChartItem } from '@/types/cachedCharts';
import { Text } from '@mantine/core';

/** Small label shown above the chart when comparison data is present. */
const CompareNote = ({ name }: { name: string }) => (
  <Text size="xs" c="dimmed" mb={4}>
    <span style={{ letterSpacing: 2, marginRight: 6 }}>– – –</span>
    dashed lines = {name}
  </Text>
);

// ---------------------------------------------------------------------------
// Demographics: Under 18 vs 65+
// ---------------------------------------------------------------------------

export const DemographicsTrendChart = <TData,>({
  chart,
}: {
  chart: ChartItem<TData>;
}) => {
  const data = chart.data as any[];
  const compareData = (chart.compareData ?? []) as any[];
  if (!data || data.length === 0) return null;

  const years = Array.from(new Set(data.map((r) => r.year))).sort();
  const labels = chart.chartParams?.legendLabels as
    | [string, string]
    | undefined;
  const cmpName = labels?.[1] ?? 'Comparison';

  const buildPoint = (rows: any[], year: number) => {
    const find = (label: string) =>
      rows.find((r) => r.year === year && r.Variable === label)?.Percent ??
      null;
    const p65_74 = find('65 to 74') ?? 0;
    const p75plus = find('75 Plus') ?? 0;
    return {
      'Under 18': find('Under 18'),
      '65+':
        p65_74 + p75plus > 0 ? Math.round((p65_74 + p75plus) * 10) / 10 : null,
    };
  };

  const plotData = years.map((year) => ({
    year,
    ...buildPoint(data, year),
    ...(compareData.length > 0
      ? {
          'Under 18 (cmp)': buildPoint(compareData, year)['Under 18'],
          '65+ (cmp)': buildPoint(compareData, year)['65+'],
        }
      : {}),
  }));

  return (
    <>
      {compareData.length > 0 && <CompareNote name={cmpName} />}
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={plotData}
          margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e0d8cc" />
          <XAxis dataKey="year" tick={{ fontSize: 12 }} />
          <YAxis unit="%" tick={{ fontSize: 12 }} domain={['auto', 'auto']} />
          <Tooltip formatter={(val: any) => (val != null ? `${val}%` : '—')} />
          <Legend />
          <Line
            type="monotone"
            dataKey="Under 18"
            stroke="#154734"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="65+"
            stroke="#e07b39"
            strokeWidth={2}
            dot={false}
          />
          {compareData.length > 0 && (
            <>
              <Line
                type="monotone"
                dataKey="Under 18 (cmp)"
                name="Under 18"
                stroke="#154734"
                strokeWidth={1.5}
                strokeDasharray="6 4"
                dot={false}
                legendType="none"
              />
              <Line
                type="monotone"
                dataKey="65+ (cmp)"
                name="65+"
                stroke="#e07b39"
                strokeWidth={1.5}
                strokeDasharray="6 4"
                dot={false}
                legendType="none"
              />
            </>
          )}
        </LineChart>
      </ResponsiveContainer>
    </>
  );
};

// ---------------------------------------------------------------------------
// Education: all attainment levels except "Some College, No Degree"
// ---------------------------------------------------------------------------

const EDU_SERIES = [
  { key: 'No High School Diploma', color: '#c0392b' },
  { key: 'High School Graduate', color: '#e07b39' },
  { key: "Associate's Degree", color: '#4c9be8' },
  { key: "Bachelor's Degree", color: '#154734' },
  { key: 'Postgraduate Degree', color: '#7d4caf' },
];

export const EducationTrendChart = <TData,>({
  chart,
}: {
  chart: ChartItem<TData>;
}) => {
  const data = chart.data as any[];
  const compareData = (chart.compareData ?? []) as any[];
  if (!data || data.length === 0) return null;

  const keys = new Set(EDU_SERIES.map((s) => s.key));
  const filtered = data.filter((r) => keys.has(r.Variable));
  const cmpFiltered = compareData.filter((r) => keys.has(r.Variable));
  const years = Array.from(new Set(filtered.map((r) => r.year))).sort();
  const labels = chart.chartParams?.legendLabels as
    | [string, string]
    | undefined;
  const cmpName = labels?.[1] ?? 'Comparison';

  const plotData = years.map((year) => {
    const rows = filtered.filter((r) => r.year === year);
    const cmpRows = cmpFiltered.filter((r) => r.year === year);
    const pt: Record<string, any> = { year };
    for (const { key } of EDU_SERIES) {
      pt[key] = rows.find((r) => r.Variable === key)?.Percent ?? null;
      if (compareData.length > 0) {
        pt[`${key} (cmp)`] =
          cmpRows.find((r) => r.Variable === key)?.Percent ?? null;
      }
    }
    return pt;
  });

  return (
    <>
      {compareData.length > 0 && <CompareNote name={cmpName} />}
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={plotData}
          margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e0d8cc" />
          <XAxis dataKey="year" tick={{ fontSize: 12 }} />
          <YAxis unit="%" tick={{ fontSize: 12 }} domain={['auto', 'auto']} />
          <Tooltip formatter={(val: any) => (val != null ? `${val}%` : '—')} />
          <Legend />
          {EDU_SERIES.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              stroke={s.color}
              strokeWidth={2}
              dot={false}
            />
          ))}
          {compareData.length > 0 &&
            EDU_SERIES.map((s) => (
              <Line
                key={`${s.key}-cmp`}
                type="monotone"
                dataKey={`${s.key} (cmp)`}
                stroke={s.color}
                strokeWidth={1.5}
                strokeDasharray="6 4"
                dot={false}
                legendType="none"
              />
            ))}
        </LineChart>
      </ResponsiveContainer>
    </>
  );
};

// ---------------------------------------------------------------------------
// Housing: Total Housing Units (left) vs Median Home Value (right, dual axis)
// ---------------------------------------------------------------------------

const HOUSING_SERIES = [
  { key: 'Total Housing Units', color: '#154734', axis: 'left' as const },
  { key: 'Renter-Occupied Units', color: '#e07b39', axis: 'left' as const },
  { key: 'Median Home Value', color: '#8b5e3c', axis: 'right' as const },
];

export const HousingTrendChart = <TData,>({
  chart,
}: {
  chart: ChartItem<TData>;
}) => {
  const data = chart.data as any[];
  const compareData = (chart.compareData ?? []) as any[];
  if (!data || data.length === 0) return null;

  const years = Array.from(new Set(data.map((r) => r.year))).sort();
  const labels = chart.chartParams?.legendLabels as
    | [string, string]
    | undefined;
  const cmpName = labels?.[1] ?? 'Comparison';

  const plotData = years.map((year) => {
    const rows = data.filter((r) => r.year === year);
    const cmpRows = compareData.filter((r) => r.year === year);
    const find = (src: any[], label: string) =>
      src.find((r) => r.Variable === label)?.Value ?? null;
    const pt: Record<string, any> = { year };
    for (const { key } of HOUSING_SERIES) {
      pt[key] = find(rows, key);
      if (compareData.length > 0) pt[`${key} (cmp)`] = find(cmpRows, key);
    }
    return pt;
  });

  const fmtTooltip = (val: any, name: string) => {
    const base = name.replace(' (cmp)', '');
    if (base === 'Total Housing Units' || base === 'Renter-Occupied Units')
      return [val?.toLocaleString() ?? '—', name];
    if (base === 'Median Home Value')
      return [`$${val?.toLocaleString() ?? '—'}`, name];
    return [val, name];
  };

  return (
    <>
      {compareData.length > 0 && <CompareNote name={cmpName} />}
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={plotData}
          margin={{ top: 10, right: 50, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e0d8cc" />
          <XAxis dataKey="year" tick={{ fontSize: 12 }} />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 12 }}
            tickFormatter={(v) => v.toLocaleString()}
            label={{
              value: 'Units',
              angle: -90,
              position: 'insideLeft',
              offset: -5,
              style: { fontSize: 11 },
            }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 12 }}
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            label={{
              value: 'Home Value',
              angle: 90,
              position: 'insideRight',
              offset: 15,
              style: { fontSize: 11 },
            }}
          />
          <Tooltip formatter={fmtTooltip} />
          <Legend />
          {HOUSING_SERIES.map((s) => (
            <Line
              key={s.key}
              yAxisId={s.axis}
              type="monotone"
              dataKey={s.key}
              stroke={s.color}
              strokeWidth={2}
              dot={false}
            />
          ))}
          {compareData.length > 0 &&
            HOUSING_SERIES.map((s) => (
              <Line
                key={`${s.key}-cmp`}
                yAxisId={s.axis}
                type="monotone"
                dataKey={`${s.key} (cmp)`}
                stroke={s.color}
                strokeWidth={1.5}
                strokeDasharray="6 4"
                dot={false}
                legendType="none"
              />
            ))}
        </LineChart>
      </ResponsiveContainer>
    </>
  );
};

// ---------------------------------------------------------------------------
// Generic two-location trend chart for the DP-combined explorer
// data:        [{year, Value}] for side A
// compareData: [{year, Value}] for side B
// chartParams.legendLabels: [sideA label, sideB label]
// chartParams.measure:      raw measure string (e.g. 'Percent') for formatting
// ---------------------------------------------------------------------------

export const DPTrendChart = <TData,>({
  chart,
}: {
  chart: ChartItem<TData>;
}) => {
  const data = chart.data as any[];
  const compareData = (chart.compareData ?? []) as any[];
  const lbls = chart.chartParams?.legendLabels as [string, string] | undefined;
  const primaryName = lbls?.[0] ?? 'Side A';
  const compareName = lbls?.[1] ?? 'Side B';
  const isPercent = (chart.chartParams?.measure as string | undefined)
    ?.toLowerCase()
    .includes('percent');

  const allYears = Array.from(
    new Set([...data, ...compareData].map((r) => r.year)),
  ).sort((a, b) => a - b);

  const plotData = allYears.map((year) => ({
    year,
    primary: data.find((r) => r.year === year)?.Value ?? null,
    compare: compareData.find((r) => r.year === year)?.Value ?? null,
  }));

  const fmt = (v: any) =>
    v != null ? (isPercent ? `${v}%` : Number(v).toLocaleString()) : '—';

  if (!data || data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={plotData}
        margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e0d8cc" />
        <XAxis dataKey="year" tick={{ fontSize: 12 }} />
        <YAxis
          tick={{ fontSize: 12 }}
          tickFormatter={(v) =>
            isPercent ? `${v}%` : Number(v).toLocaleString()
          }
          domain={['auto', 'auto']}
        />
        <Tooltip formatter={(val: any, name: string) => [fmt(val), name]} />
        <Legend />
        <Line
          type="monotone"
          dataKey="primary"
          name={primaryName}
          stroke="#154734"
          strokeWidth={2}
          dot={false}
        />
        {compareData.length > 0 && (
          <Line
            type="monotone"
            dataKey="compare"
            name={compareName}
            stroke="#8899aa"
            strokeWidth={1.5}
            strokeDasharray="6 4"
            dot={false}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
};
