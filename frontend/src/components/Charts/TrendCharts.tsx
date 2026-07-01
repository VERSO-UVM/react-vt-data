'use client';

import { useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, 
         Tooltip, XAxis, YAxis } from 'recharts';
import { ChartItem } from '@/types/cachedCharts';
import { Text } from '@mantine/core';

/** Small label shown above the chart when comparison data is present. */
const CompareNote = ({ name }: { name: string }) => (  
  <Text size="xs" c="dimmed" mb={4}>
    <span style={{ letterSpacing: 2, marginRight: 6 }}>– – –</span>
    Dashed Lines = {name}
  </Text>
);

// ---------------------------------------------------------------------------
// Demographics: Under 18 vs 65+
// ---------------------------------------------------------------------------

export const DemographicsTrendChart = <TData,>({chart}: {chart: ChartItem<TData>;}) => {
  const data = chart.data as any[];
  const compareData = (chart.compareData ?? []) as any[];
  if (!data || data.length === 0) return null;

  const years = Array.from(new Set(data.map((r) => r.year))).sort();
    
  const labels = chart.chartParams?.legendLabels as
    | [string, string]
    | undefined;
  
  const location = labels?.[0] ?? 'Main';
  const cmpName = labels?.[1] ?? 'Comparison';

  const buildPoint = (rows: any[], year: number) => {
    const find = (label: string) =>
      rows.find((r) => r.year === year && r.Variable === label)?.Percent ??
      null;
    const p65_74 = find('65 to 74') ?? 0;
    const p75plus = find('75 Plus') ?? 0;
    return {
      'Under 18': find('Under 18'),
      '65+':p65_74 + p75plus > 0 ? Math.round((p65_74 + p75plus) * 10) / 10 : null,
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
          <Legend 
            align="right"
            iconType="line"
            verticalAlign="bottom"
            
          />
          <Line
            type="monotone"
            dataKey="Under 18"
            name={`Under 18 (${location})`}
            stroke="#154734"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="65+"
            name={`65+ (${location})`}
            stroke="#e07b39"
            strokeWidth={2}
            dot={false}
          />
          {compareData.length > 0 && (
            <>
              <Line
                type="monotone"
                dataKey="Under 18 (cmp)"
                name={`Under 18 (${cmpName})`}
                stroke="#154734"
                strokeWidth={1.5}
                strokeDasharray="6 4"
                dot={false}
                legendType="none"
              />
              <Line
                type="monotone"
                dataKey="65+ (cmp)"
                name={`65+ (${cmpName})`}
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
// Demographics: Median Age Chart
// ---------------------------------------------------------------------------
export const MedianAgeTrendChart = <TData,>({chart,}: {chart: ChartItem<TData>;}) => {
  const data = chart.data as any[];
  const compareData = (chart.compareData ?? []) as any[];
  if (!data || data.length === 0) return null;

  const years = Array.from(new Set(data.map((r) => r.year))).sort();
  const labels = chart.chartParams?.legendLabels as
    | [string, string]
    | undefined;
  const cmpName = labels?.[1] ?? 'Comparison';
  const location = labels?.[0] ?? 'Main';

  const buildPoint = (rows: any[], year: number) => {
    const find = (label: string) =>
      rows.find((r) => r.year === year && r.Variable === label)?.Value ?? null;
    return { 'Median Age': find('Median Age') };
  };

  const plotData = years.map((year) => ({
    year,
    ...buildPoint(data, year),
    ...(compareData.length > 0
      ? {
          'Median Age (cmp)': buildPoint(compareData, year)['Median Age'],
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
          <YAxis
            tick={{ fontSize: 12 }}
            domain={['auto', 'auto']}
            tickFormatter={(value) => Number(value).toFixed(0)}
          />
          <Tooltip
            formatter={(val: any) =>
              val != null ? `${Number(val).toFixed(1)} years` : '—'
            }
          />
          <Line
            type="monotone"
            dataKey="Median Age"
            name={`${location}`} 
            stroke="#154734"
            strokeWidth={2}
            dot={false}
          />
          {compareData.length > 0 && (
            <>
              <Line
                type="monotone"
                dataKey="Median Age (cmp)"
                name={`${cmpName}`}
                stroke="#154734"
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
  { key: 'High School Only', color: '#e07b39' },
  { key: "Associate's Degree", color: '#4c9be8' },
  { key: "Bachelor's Degree", color: '#154734' },
  { key: 'Postgraduate Degree', color: '#7d4caf' },
];

export const EducationTrendChart = <TData,>({
  chart,
}: {
  chart: ChartItem<TData>;
}) => {
  
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const toggleSeries = (key: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };
    
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
      <Text size="xs" c="dimmed" mb={4}>
        Click legend items to show or hide education categories.
      </Text>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={plotData}
          margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e0d8cc" />
          <XAxis dataKey="year" tick={{ fontSize: 12 }} />
          <YAxis unit="%" tick={{ fontSize: 12 }} domain={['auto', 'auto']} />
          <Tooltip formatter={(val: any) => (val != null ? `${val}%` : '—')} />
          <Legend onClick={(e: any) => toggleSeries(e.dataKey)} formatter={(value) => (
            <span style={{ color: hidden.has(value) ? "#999" : "#222",
                          textDecoration: hidden.has(value) ? "line-through" : "none"}}>
              {value} 
            </span>)}/>
          {EDU_SERIES.map((s) => (
          <Line key={s.key} dataKey={s.key} stroke={s.color} strokeWidth={2}
                dot={false} hide={hidden.has(s.key)}
          />))}
          {compareData.length > 0 && EDU_SERIES.map((s) => (
              <Line key={`${s.key}-cmp`} dataKey={`${s.key} (cmp)`} stroke={s.color}
                strokeWidth={1.5} strokeDasharray="6 4" legendType="none" dot={false} hide={hidden.has(s.key)}
              />))}
        </LineChart>
      </ResponsiveContainer>
    </>
  );
};

// ---------------------------------------------------------------------------
// Housing
// ---------------------------------------------------------------------------

// Median Home Value
export const HomeValueTrendChart = <TData,>({
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
    const row = rows.find((r) => r.Variable === 'Median Home Value' && r.year === year);
    return {'Median Home Value': row?.Value ?? null};};

  const plotData = years.map((year) => ({
    year,
    ...buildPoint(data, year), ...(compareData.length > 0 ? 
      {'Median Home Value (cmp)': buildPoint(compareData, year)['Median Home Value']}: {})}));

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
          <YAxis unit="$" tick={{ fontSize: 10 }} domain={['auto', 'auto']} 
                 tickFormatter={(val: any) => val != null ? new Intl.NumberFormat('en-US').format(val) : ''} />
          <Tooltip formatter={(val: any) => val != null ? `$${new Intl.NumberFormat('en-US').format(val)}`: '—'}/>
          <Line
            type="monotone"
            dataKey="Median Home Value"
            name={`${labels?.[0] ?? 'Main'}`}
            stroke="#154734"
            strokeWidth={2}
            dot={false}
          />
          {compareData.length > 0 && (
            <>
              <Line
                type="monotone"
                dataKey="Median Home Value (cmp)"
                name={`${labels?.[1] ?? 'Comparison'}`}
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


export const HousingUnitsTrendChart = <TData,>({
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
    const row = rows.find((r) => r.Variable === 'Total Housing Units' && r.year === year);
    return {'Total Housing Units': row?.Value ?? null};};

  const plotData = years.map((year) => ({
    year,
    ...buildPoint(data, year), ...(compareData.length > 0 ? 
      {'Total Housing Units (cmp)': buildPoint(compareData, year)['Total Housing Units']}: {})}));

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
          <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} 
            tickFormatter={(value) => value.toLocaleString()}/>
          <Tooltip formatter={(value: number) => value.toLocaleString()}/>
          <Line
            type="monotone"
            dataKey="Total Housing Units"
            name={`${labels?.[0] ?? 'Main'}`}
            stroke="#154734"
            strokeWidth={2}
            dot={false}
          />
          {compareData.length > 0 && (
            <>
              <Line
                type="monotone"
                dataKey="Total Housing Units (cmp)"
                name={`${labels?.[1] ?? 'Comparison'}`}
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
// Economics: Unemployment Rate
// ---------------------------------------------------------------------------

export const UnemploymentTrendChart = <TData,>({
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
    const row = rows.find((r) => r.year === year);
    return {
      'Unemployment Rate': row?.Value ?? null,
    };
  };

  const plotData = years.map((year) => ({
    year,
    ...buildPoint(data, year),
    ...(compareData.length > 0
      ? {
          'Unemployment Rate (cmp)': buildPoint(compareData, year)[
            'Unemployment Rate'
          ],
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
          <Tooltip formatter={(val: any) => val != null ? `${Number(val).toFixed(1)}%` : '—'}/>
          <Line
            type="monotone"
            dataKey="Unemployment Rate"
            name={`${labels?.[0] ?? 'Main'}`}
            stroke="#154734"
            strokeWidth={2}
            dot={false}
          />
          {compareData.length > 0 && (
            <>
              <Line
                type="monotone"
                dataKey="Unemployment Rate (cmp)"
                name={`${labels?.[1] ?? 'Comparison'}`}
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
// Economics: Median Earnings (Male vs Female vs All Workers)
// ---------------------------------------------------------------------------

export const EarningsTrendChart = <TData,>({
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
      rows.find((r) => String(r.year) === String(year) && r.Variable === label)
        ?.Value ?? null;
    return {
      'Male Full-Time Workers': find('DP03_0093'),
      'Female Full-Time Workers': find('DP03_0094'),
      'All Workers': find('DP03_0092'),
    };
  };

  const plotData = years.map((year) => ({
    year,
    ...buildPoint(data, year),
    ...(compareData.length > 0
      ? {
          'Male Full-Time Workers (cmp)': buildPoint(compareData, year)[
            'Male Full-Time Workers'
          ],
          'Female Full-Time Workers (cmp)': buildPoint(compareData, year)[
            'Female Full-Time Workers'
          ],
          'All Workers (cmp)': buildPoint(compareData, year)['All Workers'],
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
          <YAxis
            tick={{ fontSize: 12 }}
            domain={['auto', 'auto']}
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip
            formatter={(value: any) =>
              value != null
                ? `$${Number(value).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
                : '—'
            }
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="Male Full-Time Workers"
            stroke="#1432ab"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="Female Full-Time Workers"
            stroke="#e03fd0"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="All Workers"
            stroke="#494b4d60"
            strokeWidth={2}
            dot={false}
          />
          {compareData.length > 0 && (
            <>
              <Line
                type="monotone"
                dataKey="Male Full-Time Workers (cmp)"
                name="Male Full-Time Workers (cmp)"
                stroke="#1432ab"
                strokeWidth={1.5}
                strokeDasharray="6 4"
                dot={false}
                legendType="none"
              />
              <Line
                type="monotone"
                dataKey="Female Full-Time Workers (cmp)"
                name="Female Full-Time Workers (cmp)"
                stroke="#e03fd0"
                strokeWidth={1.5}
                strokeDasharray="6 4"
                dot={false}
                legendType="none"
              />
              <Line
                type="monotone"
                dataKey="All Workers (cmp)"
                name="All Workers (cmp)"
                stroke="#494b4d60"
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
