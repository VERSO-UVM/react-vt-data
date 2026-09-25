// TrendCharts.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { usePdfMode } from '@/contexts/PdfModeContext';
import MultiRowNotice from './MultiRowNotice';
import { lineName, splitIntoLines } from './seriesLines';

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
  /** Readable series name, used as the plotData key and so the table row
   *  label. Defaults to seriesKey, then valueField. No dots — Recharts reads
   *  a dotted dataKey as a nested path. */
  displayName?: string;
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
  const isPdfMode = usePdfMode();
  const {
    seriesKey,
    valueField,
    displayName,
    format,
    decimals,
    color = '#154734',
    compareColor = '#1c7ed6',
    lineWidth = 3,
    showHelperText = true,
  } = config;

  const { hidden, toggleSeries, legendFormatter } = useToggle();

  const data = chart.data as any[];
  const compareData = chart.compareData as any[];

  const seriesName = displayName ?? seriesKey ?? valueField;
  const labels = chart.chartParams?.legendLabels as
    [string, string] | undefined;

  // Each place's rows for this series, as one line per row in a year (see
  // seriesLines.ts); normally a single line.
  const own = useMemo(
    () =>
      splitIntoLines(
        (data ?? []).filter((r) => !seriesKey || r.Variable === seriesKey),
      ),
    [data, seriesKey],
  );
  const other = useMemo(
    () =>
      splitIntoLines(
        (compareData ?? []).filter(
          (r) => !seriesKey || r.Variable === seriesKey,
        ),
      ),
    [compareData, seriesKey],
  );
  const ownKey = (i: number) => lineKey(seriesName, i);
  const otherKey = (i: number) => `${lineKey(seriesName, i)} (cmp)`;

  const years = useMemo(
    () => (data ? Array.from(new Set(data.map((r) => r.year))).sort() : []),
    [data],
  );

  const plotData = useMemo(() => {
    if (!data || data.length === 0) return [];
    const valueAt = (rows: DataRow[], year: unknown) =>
      rows.find((r) => r.year === year)?.[valueField] ?? null;
    return years.map((year) => {
      const pt: DataRow = { year };
      own.lines.forEach((line, i) => {
        pt[lineKey(seriesName, i)] = valueAt(line.rows, year);
      });
      if (compareData && compareData.length > 0) {
        other.lines.forEach((line, i) => {
          pt[`${lineKey(seriesName, i)} (cmp)`] = valueAt(line.rows, year);
        });
      }
      return pt;
    });
  }, [years, data, compareData, own, other, seriesName, valueField]);

  useEffect(() => {
    onPlotData?.(plotData);
  }, [plotData, onPlotData]);

  if (!data || data.length === 0) return null; // early return now AFTER all hooks

  const fmt = FORMATTERS[format];

  return (
    <>
      <MultiRowNotice
        chartTitle={chart.title ?? seriesName}
        maxPerYear={Math.max(own.maxPerX, other.maxPerX)}
        duplicates={own.duplicates + other.duplicates}
      />
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
              iconSize={LEGEND_ICON_SIZE}
              align="right"
              verticalAlign="bottom"
              onClick={(e: any) => toggleSeries(e.dataKey)}
              formatter={legendFormatter}
              wrapperStyle={{ fontSize: isGallery ? 12 : 16 }}
            />
          )}
          {own.lines.map((_, i) => (
            <Line
              legendType="plainline"
              key={ownKey(i)}
              type="monotone"
              dataKey={ownKey(i)}
              name={lineName(labels?.[0] ?? 'Main', own, i)}
              stroke={color}
              strokeWidth={lineWidth}
              strokeDasharray={SPLIT_DASHES[i % SPLIT_DASHES.length]}
              dot={own.lines.length > 1}
              animationBegin={0}
              isAnimationActive={!isGallery && !isPdfMode}
              animationDuration={!isGallery ? 1500 : 0}
              hide={hidden.has(ownKey(i))}
            />
          ))}
          {compareData.length > 0 &&
            other.lines.map((_, i) => (
              <Line
                legendType="plainline"
                key={otherKey(i)}
                type="monotone"
                dataKey={otherKey(i)}
                name={lineName(labels?.[1] ?? 'Comparison', other, i)}
                stroke={compareColor}
                strokeWidth={lineWidth}
                strokeDasharray={SPLIT_DASHES[i % SPLIT_DASHES.length]}
                dot={other.lines.length > 1}
                animationBegin={0}
                isAnimationActive={!isGallery && !isPdfMode}
                animationDuration={!isGallery ? 1500 : 0}
                hide={hidden.has(otherKey(i))}
              />
            ))}
        </LineChart>
      </ResponsiveContainer>
    </>
  );
};
// Legend icons are plain lines (legendType="plainline") that repeat each
// line's dash pattern; at Recharts' default 14px the dashes read as dots.
const LEGEND_ICON_SIZE = 28;

// A split series' plot key for its i-th line. The first keeps the plain
// name, so the table view's column names only change when a series splits.
const lineKey = (name: string, i: number) =>
  i === 0 ? name : `${name} (${i + 1})`;

// Line styles for a series that split into several lines (see seriesLines.ts):
// the first stays solid, the rest get dashes so they read as the same series.
const SPLIT_DASHES = [undefined, '8 4', '2 3', '12 4 2 4'];

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
  const isPdfMode = usePdfMode();
  const {
    series,
    valueField,
    format,
    showHelperText = true,
    showCompareNote = true,
    legendPosition = 'bottom-right',
    nameSuffix = true,
  } = config;

  const { hidden, toggleSeries, legendFormatter } = useToggle();

  const data = chart.data as any[];
  const compareData = chart.compareData as any[];
  const labels = chart.chartParams?.legendLabels as
    [string, string] | undefined;

  // Each series' rows per place, split into a line per row in a year (see
  // seriesLines.ts). Summed series (aggregateFrom) stay one line; their
  // extra rows only count toward the notice.
  const splitSeries = useMemo(() => {
    const split = (rows: DataRow[] | undefined, s: SeriesDef) =>
      splitIntoLines(
        (rows ?? []).filter((r) =>
          s.aggregateFrom
            ? s.aggregateFrom.includes(String(r.Variable))
            : r.Variable === (s.matchVariable ?? s.key),
        ),
      );
    return series.map((s) => ({
      own: split(data, s),
      other: split(compareData, s),
    }));
  }, [data, compareData, JSON.stringify(series)]);
  const maxPerYear = Math.max(
    0,
    ...splitSeries.flatMap(({ own, other }) => [own.maxPerX, other.maxPerX]),
  );
  const duplicates = splitSeries.reduce(
    (n, { own, other }) => n + own.duplicates + other.duplicates,
    0,
  );
  // Lines past a series' first, when it split; the first keeps s.key.
  const extraKey = (s: SeriesDef, i: number) => `${s.key} (${i + 1})`;

  const getValue = (rows: any[], year: number, s: SeriesDef) => {
    if (s.aggregateFrom) {
      const sum = s.aggregateFrom.reduce((acc, label) => {
        const v =
          rows.find((r) => r.year === year && r.Variable === label)?.[
            valueField
          ] ?? 0;
        return acc + v;
      }, 0);
      return sum > 0 ? Math.round(sum * 10) / 10 : null;
    }
    const label = s.matchVariable ?? s.key;
    return (
      rows.find((r) => r.year === year && r.Variable === label)?.[valueField] ??
      null
    );
  };

  const years = useMemo(
    () => (data ? Array.from(new Set(data.map((r) => r.year))).sort() : []),
    [data],
  );

  const plotData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return years.map((year) => {
      const pt: Record<string, any> = { year };
      series.forEach((s, si) => {
        pt[s.key] = getValue(data, year, s);
        if (compareData && compareData.length > 0)
          pt[`${s.key} (cmp)`] = getValue(compareData, year, s);
        if (s.aggregateFrom) return;
        const { own, other } = splitSeries[si];
        const at = (line: { rows: DataRow[] }) =>
          line.rows.find((r) => r.year === year)?.[valueField] ?? null;
        own.lines.forEach((line, i) => {
          if (i === 0) pt[s.key] = at(line);
          else pt[extraKey(s, i)] = at(line);
        });
        other.lines.forEach((line, i) => {
          if (i === 0) pt[`${s.key} (cmp)`] = at(line);
          else pt[`${extraKey(s, i)} (cmp)`] = at(line);
        });
      });
      return pt;
    });
  }, [
    years,
    data,
    compareData,
    JSON.stringify(series),
    valueField,
    splitSeries,
  ]);

  useEffect(() => {
    onPlotData?.(plotData);
  }, [plotData, onPlotData]);

  if (!data || data.length === 0) return null;

  const fmt = FORMATTERS[format];

  return (
    <>
      <MultiRowNotice
        chartTitle={chart.title ?? 'Trend'}
        maxPerYear={maxPerYear}
        duplicates={duplicates}
      />
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
              iconSize={LEGEND_ICON_SIZE}
              align="right"
              verticalAlign="bottom"
              onClick={(e: any) => toggleSeries(e.dataKey)}
              formatter={legendFormatter}
              wrapperStyle={{ fontSize: isGallery ? 12 : 16 }}
            />
          )}
          {series.map((s) => (
            <Line
              legendType="plainline"
              key={s.key}
              dataKey={s.key}
              name={
                nameSuffix ? `${s.key} (${labels?.[0] ?? 'Main'})` : undefined
              }
              stroke={s.color}
              strokeWidth={2}
              dot={false}
              isAnimationActive={!isGallery && !isPdfMode}
              animationDuration={!isGallery ? 1500 : 0}
              hide={hidden.has(s.key)}
            />
          ))}
          {series.flatMap((s, si) =>
            splitSeries[si].own.lines
              .slice(1)
              .map((line, j) => (
                <Line
                  legendType="plainline"
                  key={extraKey(s, j + 1)}
                  dataKey={extraKey(s, j + 1)}
                  name={`${s.key} — ${line.label ?? `value ${j + 2}`} (${labels?.[0] ?? 'Main'})`}
                  stroke={s.color}
                  strokeWidth={2}
                  strokeDasharray={SPLIT_DASHES[(j + 1) % SPLIT_DASHES.length]}
                  dot
                  isAnimationActive={!isGallery && !isPdfMode}
                  animationDuration={!isGallery ? 1500 : 0}
                  hide={hidden.has(extraKey(s, j + 1))}
                />
              )),
          )}
          {compareData.length > 0 &&
            series.flatMap((s, si) =>
              splitSeries[si].other.lines
                .slice(1)
                .map((line, j) => (
                  <Line
                    key={`${extraKey(s, j + 1)}-cmp`}
                    dataKey={`${extraKey(s, j + 1)} (cmp)`}
                    name={`${s.key} — ${line.label ?? `value ${j + 2}`} (${labels?.[1] ?? 'Comparison'})`}
                    stroke={s.color}
                    strokeWidth={1.5}
                    strokeDasharray="2 3"
                    legendType="none"
                    dot
                    isAnimationActive={!isGallery && !isPdfMode}
                    animationDuration={!isGallery ? 1500 : 0}
                    hide={hidden.has(s.key)}
                  />
                )),
            )}
          {compareData.length > 0 &&
            series.map((s) => (
              <Line
                key={`${s.key}-cmp`}
                dataKey={`${s.key} (cmp)`}
                // Always named: without one the tooltip falls back to the
                // internal "(cmp)" dataKey. legendType="none" hides it from the legend.
                name={`${s.key} (${labels?.[1] ?? 'Comparison'})`}
                stroke={s.color}
                strokeWidth={1.5}
                strokeDasharray="6 4"
                legendType="none"
                isAnimationActive={!isGallery && !isPdfMode}
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

export const HistoricPopulationChangeTrendChart = <TData,>({
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
      valueField: 'Pct_Population_Change',
      displayName: 'Population Change (%)',
      format: 'percent',
      decimals: 1,
      showHelperText: false,
    },
    view,
    onPlotData,
  );

export const PopulationChangeTrendChart = <TData,>({
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
      valueField: 'Pct_Population_Change',
      displayName: 'Population Change (%)',
      format: 'percent',
      decimals: 1,
      showHelperText: false,
    },
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
    {
      seriesKey: null,
      valueField: 'Median_Age',
      displayName: 'Median Age',
      format: 'years',
    },
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
      seriesKey: 'Unemployment Rate',
      valueField: 'Percent',
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
      seriesKey: null,
      valueField: 'Median_Household_Income',
      displayName: 'Median Household Income',
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
      seriesKey: null,
      valueField: 'Per_Capita_Income',
      displayName: 'Per Capita Income',
      format: 'currency',
      showHelperText: false,
    },
    view,
    onPlotData,
  );

export const HousingIncomeBurdenChart = <TData,>({
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
      series: [
        {
          key: 'All Households',
          matchVariable: 'All households',
          color: '#222222',
        },
        { key: 'Renters', color: '#d62828' },
        {
          key: 'Owners with a Mortgage',
          matchVariable: 'Owners with a mortgage',
          color: '#1c7ed6',
        },
        {
          key: 'Owners without a Mortgage',
          matchVariable: 'Owners without a mortgage',
          color: '#2f9e44',
        },
      ],
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
        {
          key: '65+',
          aggregateFrom: ['65 to 74', '75 Plus'],
          color: '#1c7ed6',
        },
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
        {
          key: 'Male Full-Time Workers',
          matchVariable:
            'Median earnings for male full-time, year-round workers (dollars)',
          color: '#161E54',
        },
        {
          key: 'Female Full-Time Workers',
          matchVariable:
            'Median earnings for female full-time, year-round workers (dollars)',
          color: '#F16D34',
        },
        {
          key: 'All Workers',
          matchVariable: 'Median earnings for workers (dollars)',
          color: '#9BB0C1',
        },
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

  // A side with several rows in a year (e.g. owner costs with and without a
  // mortgage under one label) gets a line per row rather than the first.
  const primary = splitIntoLines(data);
  const compare = splitIntoLines(compareData);

  const allYears = Array.from(
    new Set([...data, ...compareData].map((r) => r.year)),
  ).sort((a, b) => Number(a) - Number(b));

  const plotData = allYears.map((year) => {
    const pt: Record<string, unknown> = { year };
    primary.lines.forEach((line, i) => {
      pt[`primary${i}`] = line.rows.find((r) => r.year === year)?.Value ?? null;
    });
    compare.lines.forEach((line, i) => {
      pt[`compare${i}`] = line.rows.find((r) => r.year === year)?.Value ?? null;
    });
    return pt;
  });

  if (!data || data.length === 0) return null;

  return (
    <>
      <MultiRowNotice
        chartTitle={chart.title ?? 'DP trend'}
        maxPerYear={Math.max(primary.maxPerX, compare.maxPerX)}
        duplicates={primary.duplicates + compare.duplicates}
      />
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
          <Legend iconSize={LEGEND_ICON_SIZE} />
          {primary.lines.map((_, i) => (
            <Line
              legendType="plainline"
              key={`primary${i}`}
              type="monotone"
              dataKey={`primary${i}`}
              name={lineName(primaryName, primary, i)}
              stroke={PRIMARY_SHADES[i % PRIMARY_SHADES.length]}
              strokeWidth={2}
              dot={primary.lines.length > 1}
            />
          ))}
          {compareData.length > 0 &&
            compare.lines.map((_, i) => (
              <Line
                legendType="plainline"
                key={`compare${i}`}
                type="monotone"
                dataKey={`compare${i}`}
                name={lineName(compareName, compare, i)}
                stroke={COMPARE_SHADES[i % COMPARE_SHADES.length]}
                strokeWidth={1.5}
                strokeDasharray="6 4"
                dot={compare.lines.length > 1}
              />
            ))}
        </LineChart>
      </ResponsiveContainer>
    </>
  );
};

// Each side's lines when it splits: its own color first, then lighter and
// darker shades of it, so the sides stay apart and every line is visible.
const PRIMARY_SHADES = ['#154734', '#4f8a6a', '#8fbf9f', '#0b2a1f'];
const COMPARE_SHADES = ['#8899aa', '#5d6f82', '#b3c0cc', '#3f4d5c'];
