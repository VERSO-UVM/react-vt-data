// TrendCharts.tsx
'use client';

import { useState, useEffect, useMemo} from 'react';
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
import { ChartItem, DataRow } from '@/types/cachedCharts';

// tidy ACS-style row consumed by the trend charts
interface TrendRow extends DataRow {
  year?: number | string;
  Variable?: string;
  Value?: number;
  Percent?: number;
}
import { Text } from '@mantine/core';

const CompareNote = ({ name }: { name: string }) => (
  <Text size="xs" c="dimmed" mb={4}>
    <span style={{ letterSpacing: 2, marginRight: 6 }}>– – –</span>
    Dashed Lines = {name}
  </Text>
);

// ---------------------------------------------------------------------------
// Shared formatters
// ---------------------------------------------------------------------------

type FormatType = 'currency' | 'percent' | 'number' | 'years';

const FORMATTERS: Record<
  FormatType,
  {
    unit?: string;
    axisFormatter?: (v: any) => string;
    tooltip: (v: any, decimals?: number) => string;
  }
> = {
  currency: {
    axisFormatter: (v) => `$${(v / 1000).toFixed(0)}k`,
    tooltip: (v) =>
      v != null
        ? `$${Number(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
        : '—',
  },
  percent: {
    unit: '%',
    tooltip: (v, decimals) =>
      v != null
        ? `${decimals != null ? Number(v).toFixed(decimals) : v}%`
        : '—',
  },
  number: {
    axisFormatter: (v) => `${(v / 1000).toFixed(0)}k`,
    tooltip: (v) => (v != null ? Number(v).toLocaleString() : '—'),
  },
  years: {
    axisFormatter: (v) => Number(v).toFixed(0),
    tooltip: (v) => (v != null ? `${Number(v).toFixed(1)} years` : '—'),
  },
};

const useToggle = () => {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const toggleSeries = (key: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  const legendFormatter = (value: string) => (
    <span
      style={{
        color: hidden.has(value) ? '#999' : '#222',
        textDecoration: hidden.has(value) ? 'line-through' : 'none',
      }}
    >
      {value}
    </span>
  );
  return { hidden, toggleSeries, legendFormatter };
};

// ---------------------------------------------------------------------------
// Single-series trend chart
// Covers: Population, MedianAge, HomeValue, HousingUnits, HousingTenure,
//         LaborForce (both), Unemployment, HouseholdIncome, PerCapitaIncome
// ---------------------------------------------------------------------------

export interface SingleSeriesConfig {
  /** r.Variable value to match. Use null when rows have no Variable column
   *  (e.g. Population, Unemployment) and should just be matched by year. */
  seriesKey: string | null;
  /** Field to read off the matched row, e.g. 'Value' | 'Percent' | 'Population'. */
  valueField: string;
  format: FormatType;
  /** For percent format, forces toFixed(decimals) in the tooltip (Unemployment uses 1). */
  decimals?: number;
  color?: string;
  compareColor?: string;
  lineWidth?: number;

  showHelperText?: boolean;
}

export const SingleSeriesTrendChart = <TData,>({
  chart,
  config,
  view,
  onPlotData,
}: {
  chart: ChartItem<TData>;
  config: SingleSeriesConfig;
  view?: 'gallery' | 'report';
  onPlotData?: (rows: DataRow[]) => void;
}) => {
  const isGallery = view === 'gallery';
  const {
    seriesKey, valueField, format, decimals,
    color = '#154734', compareColor = '#1c7ed6',
    lineWidth = 3, showHelperText = true,
  } = config;

  const { hidden, toggleSeries, legendFormatter } = useToggle();

  const data = chart.data as any[];
  const compareData = chart.compareData as any[];

  const seriesName = seriesKey ?? valueField;
  const labels = chart.chartParams?.legendLabels as [string, string] | undefined;

  const findValue = (rows: any[], year: number) => {
    const row = seriesKey
      ? rows.find((r) => r.year === year && r.Variable === seriesKey)
      : rows.find((r) => r.year === year);
    return row?.[valueField] ?? null;
  };

  const years = useMemo(
    () => (data ? Array.from(new Set(data.map((r) => r.year))).sort() : []),
    [data],
  );

  const plotData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return years.map((year) => ({
      year,
      [seriesName]: findValue(data, year),
      ...(compareData && compareData.length > 0
        ? { [`${seriesName} (cmp)`]: findValue(compareData, year) }
        : {}),
    }));
  }, [years, data, compareData, seriesName]);

  useEffect(() => {
    onPlotData?.(plotData);
  }, [plotData, onPlotData]);

  if (!data || data.length === 0) return null; // early return now AFTER all hooks

  const fmt = FORMATTERS[format];

  return (
    <>
      {showHelperText && !isGallery && (
        <Text size="xs" c="dimmed" mb={4}>
          Click legend items to show or hide locations.
        </Text>
      )}
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={plotData}
          margin={
            isGallery
              ? { top: 4, right: 8, left: 0, bottom: 0 }
              : { top: 10, right: 20, left: 0, bottom: 5 }
          }
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e0d8cc" />
          <XAxis
            dataKey="year"
            tick={{ fontSize: isGallery ? 11 : 11 }}
            interval={1}
          />
          <YAxis
            unit={fmt.unit}
            tick={{ fontSize: isGallery ? 9 : 11 }}
            domain={['auto', 'auto']}
            tickFormatter={fmt.axisFormatter}
          />
          {!isGallery && (
            <Tooltip formatter={(v: any) => fmt.tooltip(v, decimals)} />
          )}
          {!isGallery && (
            <Legend
              align="right"
              verticalAlign="bottom"
              onClick={(e: any) => toggleSeries(e.dataKey)}
              formatter={legendFormatter}
              wrapperStyle={{ fontSize: isGallery ? 12 : 16 }}
            />
          )}
          <Line
            type="monotone"
            dataKey={seriesName}
            name={labels?.[0] ?? 'Main'}
            stroke={color}
            strokeWidth={lineWidth}
            dot={false}
            animationBegin={0}
            animationDuration={!isGallery ? 1500 : 0}
            hide={hidden.has(seriesName)}
          />
          {compareData.length > 0 && (
            <Line
              type="monotone"
              dataKey={`${seriesName} (cmp)`}
              name={labels?.[1] ?? 'Comparison'}
              stroke={compareColor}
              strokeWidth={lineWidth}
              dot={false}
              animationBegin={0}
              animationDuration={!isGallery ? 1500 : 0}
              hide={hidden.has(`${seriesName} (cmp)`)}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </>
  );
};
// ---------------------------------------------------------------------------
// Multi-series trend chart
// Covers: Demographics (Under 18 / 65+ w/ aggregation), Education, Earnings
// ---------------------------------------------------------------------------

export interface SeriesDef {
  key: string; // display key / legend label
  matchVariable?: string; // r.Variable to match (defaults to `key`)
  aggregateFrom?: string[]; // sum these r.Variable matches instead (Demographics 65+)
  color: string;
}

export interface MultiSeriesConfig {
  series: SeriesDef[];
  valueField: string; // 'Value' | 'Percent'
  format: FormatType;
  showHelperText?: boolean;
  showCompareNote?: boolean;
  legendPosition?: 'default' | 'bottom-right';
  /** Education's legend shows bare series names with no "(Main)" suffix. */
  nameSuffix?: boolean;
}

export const MultiSeriesTrendChart = <TData,>({
  chart,
  config,
  view,
  onPlotData,
}: {
  chart: ChartItem<TData>;
  config: MultiSeriesConfig;
  view?: 'gallery' | 'report';
  onPlotData?: (rows: DataRow[]) => void;
}) => {
  const isGallery = view === 'gallery';
  const {
    series, valueField, format,
    showHelperText = true, showCompareNote = true,
    legendPosition = 'bottom-right', nameSuffix = true,
  } = config;

  const { hidden, toggleSeries, legendFormatter } = useToggle();

  const data = chart.data as any[];
  const compareData = chart.compareData as any[];
  const labels = chart.chartParams?.legendLabels as [string, string] | undefined;

  const getValue = (rows: any[], year: number, s: SeriesDef) => {
    if (s.aggregateFrom) {
      const sum = s.aggregateFrom.reduce((acc, label) => {
        const v = rows.find((r) => r.year === year && r.Variable === label)?.[valueField] ?? 0;
        return acc + v;
      }, 0);
      return sum > 0 ? Math.round(sum * 10) / 10 : null;
    }
    const label = s.matchVariable ?? s.key;
    return rows.find((r) => r.year === year && r.Variable === label)?.[valueField] ?? null;
  };

  const years = useMemo(
    () => (data ? Array.from(new Set(data.map((r) => r.year))).sort() : []),
    [data],
  );

  const plotData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return years.map((year) => {
      const pt: Record<string, any> = { year };
      for (const s of series) {
        pt[s.key] = getValue(data, year, s);
        if (compareData && compareData.length > 0)
          pt[`${s.key} (cmp)`] = getValue(compareData, year, s);
      }
      return pt;
    });
  }, [years, data, compareData, JSON.stringify(series), valueField]);

  useEffect(() => {
    onPlotData?.(plotData);
  }, [plotData, onPlotData]);

  if (!data || data.length === 0) return null;
  
  const fmt = FORMATTERS[format];

  return (
    <>
      {compareData.length > 0 && !isGallery && (
        <CompareNote name={labels?.[1] ?? 'Comparison'} />
      )}
      {!isGallery && (
        <Text size="xs" c="dimmed" mb={4}>
          Click legend items to show or hide categories.
        </Text>
      )}
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={plotData}
          margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e0d8cc" />
          <XAxis
            dataKey="year"
            tick={{ fontSize: isGallery ? 11 : 11 }}
            interval={1}
          />
          <YAxis
            unit={fmt.unit}
            tick={{ fontSize: isGallery ? 9 : 11 }}
            domain={['auto', 'auto']}
            tickFormatter={fmt.axisFormatter}
          />
          {!isGallery && <Tooltip formatter={(v: any) => fmt.tooltip(v)} />}
          {!isGallery && (
            <Legend
              align="right"
              verticalAlign="bottom"
              onClick={(e: any) => toggleSeries(e.dataKey)}
              formatter={legendFormatter}
              wrapperStyle={{ fontSize: isGallery ? 12 : 16 }}
            />
          )}
          {series.map((s) => (
            <Line
              key={s.key}
              dataKey={s.key}
              name={
                nameSuffix ? `${s.key} (${labels?.[0] ?? 'Main'})` : undefined
              }
              stroke={s.color}
              strokeWidth={2}
              dot={false}
              animationDuration={!isGallery ? 1500 : 0}
              hide={hidden.has(s.key)}
            />
          ))}
          {compareData.length > 0 &&
            series.map((s) => (
              <Line
                key={`${s.key}-cmp`}
                dataKey={`${s.key} (cmp)`}
                name={
                  nameSuffix
                    ? `${s.key} (${labels?.[1] ?? 'Comparison'})`
                    : undefined
                }
                stroke={s.color}
                strokeWidth={1.5}
                strokeDasharray="6 4"
                legendType="none"
                animationDuration={!isGallery ? 1500 : 0}
                dot={false}
                hide={hidden.has(s.key)}
              />
            ))}
        </LineChart>
      </ResponsiveContainer>
    </>
  );
};

// SINGLE CHARTS
const single = (
  chart: ChartItem<any>,
  config: SingleSeriesConfig,
  view?: 'gallery' | 'report',
  onPlotData?: (rows: DataRow[]) => void,
) => (
  <SingleSeriesTrendChart
    chart={chart}
    config={config}
    view={view}
    onPlotData={onPlotData}
  />
);

export const PopulationTrendChart = <TData,>({
  chart,
  view,
  onPlotData,
}: {
  chart: ChartItem<TData>;
  view?: 'gallery' | 'report';
  onPlotData?: (rows: DataRow[]) => void;
}) =>
  single(
    chart,
    { seriesKey: null, valueField: 'Population', format: 'number' },
    view,
    onPlotData,
  );

export const MedianAgeTrendChart = <TData,>({
  chart,
  view,
  onPlotData,
}: {
  chart: ChartItem<TData>;
  view?: 'gallery' | 'report';
  onPlotData?: (rows: DataRow[]) => void;
}) =>
  single(
    chart,
    { seriesKey: 'Median Age', valueField: 'Value', format: 'years' },
    view,
    onPlotData,
  );

export const HomeValueTrendChart = <TData,>({
  chart,
  view,
  onPlotData,
}: {
  chart: ChartItem<TData>;
  view?: 'gallery' | 'report';
  onPlotData?: (rows: DataRow[]) => void;
}) =>
  single(
    chart,
    { seriesKey: 'Median Home Value', valueField: 'Value', format: 'currency' },
    view,
    onPlotData,
  );

export const HousingUnitsTrendChart = <TData,>({
  chart,
  view,
  onPlotData,
}: {
  chart: ChartItem<TData>;
  view?: 'gallery' | 'report';
  onPlotData?: (rows: DataRow[]) => void;
}) =>
  single(
    chart,
    { seriesKey: 'Total Housing Units', valueField: 'Value', format: 'number' },
    view,
    onPlotData,
  );

export const HousingTenureAreaChart = <TData,>({
  chart,
  view,
  onPlotData,
}: {
  chart: ChartItem<TData>;
  view?: 'gallery' | 'report';
  onPlotData?: (rows: DataRow[]) => void;
}) =>
  single(
    chart,
    {
      seriesKey: 'Renter-Occupied Units',
      valueField: 'Percent',
      format: 'percent',
    },
    view,
    onPlotData,
  );

export const LaborForceTrendChart = <TData,>({
  chart,
  view,
  onPlotData,
}: {
  chart: ChartItem<TData>;
  view?: 'gallery' | 'report';
  onPlotData?: (rows: DataRow[]) => void;
}) =>
  single(
    chart,
    {
      seriesKey: 'Labor Force Participation Rate (16+)',
      valueField: 'Percent',
      format: 'percent',
    },
    view,
    onPlotData,
  );

export const LaborForceTrendChartPrimeAge = <TData,>({
  chart,
  view,
  onPlotData,
}: {
  chart: ChartItem<TData>;
  view?: 'gallery' | 'report';
  onPlotData?: (rows: DataRow[]) => void;
}) =>
  single(
    chart,
    {
      seriesKey: 'Prime-Age Labor Force Participation Rate (25-54)',
      valueField: 'Percent',
      format: 'percent',
    },
    view,
    onPlotData,
  );

export const UnemploymentTrendChart = <TData,>({
  chart,
  view,
  onPlotData,
}: {
  chart: ChartItem<TData>;
  view?: 'gallery' | 'report';
  onPlotData?: (rows: DataRow[]) => void;
}) =>
  single(
    chart,
    {
      seriesKey: null,
      valueField: 'Value',
      format: 'percent',
      decimals: 1,
    },
    view,
    onPlotData,
  );

export const HouseholdIncomeTrendChart = <TData,>({
  chart,
  view,
  onPlotData,
}: {
  chart: ChartItem<TData>;
  view?: 'gallery' | 'report';
  onPlotData?: (rows: DataRow[]) => void;
}) =>
  single(
    chart,
    {
      seriesKey: 'Median Household Income',
      valueField: 'Value',
      format: 'currency',
      showHelperText: false,
    },
    view,
    onPlotData,
  );

export const PerCapitaIncomeTrendChart = <TData,>({
  chart,
  view,
  onPlotData,
}: {
  chart: ChartItem<TData>;
  view?: 'gallery' | 'report';
  onPlotData?: (rows: DataRow[]) => void;
}) =>
  single(
    chart,
    {
      seriesKey: 'Per Capita Income',
      valueField: 'Value',
      format: 'currency',
      showHelperText: false,
    },
    view,
    onPlotData,
  );

// MULTI CHARTS
const multi = (
  chart: ChartItem<any>,
  config: MultiSeriesConfig,
  view?: 'gallery' | 'report',
  onPlotData?: (rows: DataRow[]) => void,
) => (
  <MultiSeriesTrendChart
    chart={chart}
    config={config}
    view={view}
    onPlotData={onPlotData}
  />
);

export const DemographicsTrendChart = <TData,>({
  chart,
  view,
  onPlotData,
}: {
  chart: ChartItem<TData>;
  view?: 'gallery' | 'report';
  onPlotData?: (rows: DataRow[]) => void;
}) =>
  multi(
    chart,
    {
      valueField: 'Percent',
      format: 'percent',
      series: [
        { key: 'Under 18', color: '#154734' },
        { key: '65+', aggregateFrom: ['65 to 74', '75 Plus'], color: '#1c7ed6' },
      ],
    },
    view,
    onPlotData,
  );

export const EducationTrendChart = <TData,>({
  chart,
  view,
  onPlotData,
}: {
  chart: ChartItem<TData>;
  view?: 'gallery' | 'report';
  onPlotData?: (rows: DataRow[]) => void;
}) =>
  multi(
    chart,
    {
      valueField: 'Percent',
      format: 'percent',
      nameSuffix: false,
      legendPosition: 'default',
      series: [
        { key: 'No High School Diploma', color: '#d62828' },
        { key: 'High School Graduate', color: '#f77f00' },
        { key: "Associate's Degree", color: '#fcbf49' },
        { key: "Bachelor's Degree", color: '#003049' },
        { key: 'Postgraduate Degree', color: '#457b9d' },
      ],
    },
    view,
    onPlotData,
  );

export const EarningsTrendChart = <TData,>({
  chart,
  view,
  onPlotData,
}: {
  chart: ChartItem<TData>;
  view?: 'gallery' | 'report';
  onPlotData?: (rows: DataRow[]) => void;
}) =>
  multi(
    chart,
    {
      valueField: 'Value',
      format: 'currency',
      series: [
        { key: 'Male Full-Time Workers', matchVariable: 'DP03_0093', color: '#161E54' },
        { key: 'Female Full-Time Workers', matchVariable: 'DP03_0094', color: '#F16D34' },
        { key: 'All Workers', matchVariable: 'DP03_0092', color: '#9BB0C1' },
      ],
    },
    view,
    onPlotData,
  );

// ---------------------------------------------------------------------------
// Generic two-location trend chart for the DP-combined explorer
// data:        [{year, Value}] for side A
// compareData: [{year, Value}] for side B
// chartParams.legendLabels: [sideA label, sideB label]
// chartParams.measure:      raw measure string (e.g. 'Percent') for formatting
// ---------------------------------------------------------------------------

export const DPTrendChart = ({ chart }: { chart: ChartItem<TrendRow> }) => {
  const data = chart.data;
  const compareData = chart.compareData ?? [];
  const lbls = chart.chartParams?.legendLabels as [string, string] | undefined;
  const primaryName = lbls?.[0] ?? 'Side A';
  const compareName = lbls?.[1] ?? 'Side B';
  const isPercent = (chart.chartParams?.measure as string | undefined)
    ?.toLowerCase()
    .includes('percent');

  const allYears = Array.from(
    new Set([...data, ...compareData].map((r) => r.year)),
  ).sort((a, b) => Number(a) - Number(b));

  const plotData = allYears.map((year) => ({
    year,
    primary: data.find((r) => r.year === year)?.Value ?? null,
    compare: compareData.find((r) => r.year === year)?.Value ?? null,
  }));

  const fmt = (v: unknown) =>
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
        <Tooltip
          formatter={(value) => {
            return (Number(value) || 0).toLocaleString();
          }}
        />
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
