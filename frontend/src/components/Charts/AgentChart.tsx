'use client';

/**
 * Generic chart for charts the data chat agent builds: line, bar, stacked bar,
 * stacked area, or table (chartParams.kind). The agent picks the columns
 * (chartParams.series / yUnit / columns plus xField / yField), so this draws
 * whatever rows its data reference returned rather than one fixed dataset like
 * the other chart components.
 */
import React, { useEffect, useMemo } from 'react';
import {
  Area,
  AreaChart,
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
import { ScrollArea, Table, Text } from '@mantine/core';
import { COLORS } from '@/app/theme';
import { usePdfMode } from '@/contexts/PdfModeContext';
import type { ChartItem, DataRow } from '@/types/cachedCharts';

// Distinct hues from the site palette outward, ordered so neighbors in a
// stack never share a family (two ambers, or spruce next to slate, blur).
const PALETTE = [
  COLORS.spruce,
  COLORS.amber,
  '#4f7f9e', // lake blue
  COLORS.red,
  '#7a6c9d', // purple
  '#7a9e5b', // moss
  '#5fa8a0', // teal
  '#a35d84', // plum
  '#8c5a3c', // brown
  COLORS.slate,
  '#b8a230', // mustard
  '#9aa5ad', // light gray
];
// More lines than this stop being readable; the rest are noted, not drawn.
// Stacks show parts of one whole, so they can carry a few more layers.
const MAX_LINES = 8;
const MAX_LAYERS = PALETTE.length;

export type AgentChartKind = 'line' | 'bar' | 'stacked_bar' | 'area' | 'table';

// Plumbing columns a reader doesn't need in a table (mirrors the backend).
const HIDDEN_COLUMNS = new Set([
  '_location_id',
  '_units',
  '_unit_issue',
  'geoid',
  'county_fips',
]);

type Format = 'currency' | 'percent' | 'number';

function formatFor(unit: unknown): Format {
  const u = String(unit ?? '').toLowerCase();
  if (u.includes('usd') || u.includes('$') || u.includes('dollar'))
    return 'currency';
  if (u.includes('percent') || u.includes('%')) return 'percent';
  return 'number';
}

const compact = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

function axisLabel(v: number, format: Format) {
  if (format === 'percent') return `${v}%`;
  return format === 'currency' ? `$${compact.format(v)}` : compact.format(v);
}

function tooltipLabel(v: unknown, format: Format) {
  if (v == null || v === '') return '—';
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  if (format === 'percent') return `${n.toLocaleString('en-US')}%`;
  if (format === 'currency')
    return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  return n.toLocaleString('en-US');
}

/** "Mendon town, Rutland County, Vermont" -> "Mendon town" for labels. */
const shortName = (v: unknown) => String(v ?? '').split(',')[0];

/** Turn long rows (one per x and series) into one row per x value. */
export function pivotRows(
  rows: DataRow[],
  x: string,
  y: string,
  series?: string | null,
) {
  const keys: string[] = [];
  const byX = new Map<string, DataRow>();
  for (const row of rows) {
    const xValue = row[x];
    if (xValue == null) continue;
    const key = series ? String(row[series] ?? 'Unknown') : y;
    if (!keys.includes(key)) keys.push(key);
    const id = String(xValue);
    const point = byX.get(id) ?? { [x]: xValue };
    point[key] = row[y] == null ? null : Number(row[y]);
    byX.set(id, point);
  }
  const points = Array.from(byX.values());
  if (points.every((p) => typeof p[x] === 'number')) {
    points.sort((a, b) => Number(a[x]) - Number(b[x]));
    // x is a category axis; as strings, years read "2011" rather than
    // "2,011" in the report's table view.
    for (const p of points) p[x] = String(p[x]);
  }
  return { points, keys };
}

// Years and ids read wrong with thousands separators or right-aligned.
const isIdentifier = (column: string) => /year|_id$|^id$/i.test(column);

/** "district_name" / "districtType" -> "District name" / "District type". */
function headerLabel(column: string) {
  const words = column
    .replace(/^_+/, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function cellText(column: string, value: unknown) {
  if (value == null || value === '') return '—';
  if (typeof value === 'number') {
    if (isIdentifier(column)) return String(value);
    return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
  }
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

/** Rows as a scrollable table, for results too many or varied to chart. */
function AgentTable({
  rows,
  columns,
}: {
  rows: DataRow[];
  columns?: string[] | null;
}) {
  const shown =
    columns && columns.length
      ? columns
      : Object.keys(rows[0] ?? {}).filter(
          (c) => !HIDDEN_COLUMNS.has(c) && typeof rows[0][c] !== 'object',
        );
  // Numeric columns line up on the right, like a spreadsheet.
  const numeric = new Set(
    shown.filter(
      (c) =>
        !isIdentifier(c) &&
        rows.some((r) => typeof r[c] === 'number') &&
        rows.every((r) => r[c] == null || typeof r[c] === 'number'),
    ),
  );
  const align = (c: string) => (numeric.has(c) ? 'right' : 'left');
  const isPdfMode = usePdfMode();
  const table = (
    <Table
      striped
      highlightOnHover
      stickyHeader={!isPdfMode}
      fz="sm"
      style={{ fontVariantNumeric: 'tabular-nums' }}
    >
      <Table.Thead>
        <Table.Tr>
          {shown.map((c) => (
            <Table.Th key={c} style={{ textAlign: align(c) }}>
              {headerLabel(c)}
            </Table.Th>
          ))}
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {rows.map((row, i) => (
          <Table.Tr key={i}>
            {shown.map((c) => (
              <Table.Td key={c} style={{ textAlign: align(c) }}>
                {cellText(c, row[c])}
              </Table.Td>
            ))}
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
  // A PDF can't scroll, so print every row at full height.
  return isPdfMode ? (
    table
  ) : (
    <ScrollArea h="100%" type="auto">
      {table}
    </ScrollArea>
  );
}

interface AgentChartProps<TData> {
  chart: ChartItem<TData>;
  view?: 'gallery' | 'report';
  onPlotData?: (rows: DataRow[]) => void;
  /** Receive the chart's notes (clipped series, gaps) instead of drawing
   *  them, so a caller can merge them into its own footer line. */
  onNotes?: (notes: string[]) => void;
}

export const AgentChart = <TData,>({
  chart,
  onPlotData,
  onNotes,
}: AgentChartProps<TData>) => {
  const params = chart.chartParams ?? {};
  const kind = (params.kind as AgentChartKind | undefined) ?? 'line';
  const series = (params.series as string | null | undefined) ?? null;
  const format = formatFor(params.yUnit);
  const rows = chart.data as unknown as DataRow[];

  const { points, keys } = useMemo(
    () =>
      kind === 'table'
        ? { points: rows, keys: [] as string[] }
        : pivotRows(rows, chart.xField, chart.yField, series),
    [kind, rows, chart.xField, chart.yField, series],
  );
  const stacked = kind === 'stacked_bar' || kind === 'area';
  const drawn = keys.slice(0, stacked ? MAX_LAYERS : MAX_LINES);
  const clipped = keys.length > drawn.length;
  // A missing value leaves a hole in a stack; say so rather than draw a zero.
  const gaps = stacked && points.some((p) => drawn.some((k) => p[k] == null));
  const notes = [
    clipped ? `Showing ${drawn.length} of ${keys.length} series.` : '',
    gaps ? 'Gaps mark missing values.' : '',
  ].filter(Boolean);
  const notesKey = notes.join('|');

  useEffect(() => {
    onPlotData?.(points);
  }, [points, onPlotData]);

  useEffect(() => {
    onNotes?.(notesKey ? notesKey.split('|') : []);
  }, [notesKey, onNotes]);
  const ownNotes = onNotes ? [] : notes;

  if (kind === 'table') {
    return (
      <AgentTable rows={rows} columns={params.columns as string[] | null} />
    );
  }

  // Bars over named categories (towns, counties) go sideways so long names
  // stay readable; years and other numbers keep vertical bars.
  const horizontal =
    (kind === 'bar' || kind === 'stacked_bar') &&
    points.some((p) => Number.isNaN(Number(p[chart.xField])));

  const shared = {
    data: points,
    margin: { top: 10, right: 24, left: 8, bottom: 10 },
  };
  const valueAxis = {
    tick: { fontSize: 12 },
    tickFormatter: (v: number) => axisLabel(v, format),
  };
  const categoryAxis = { dataKey: chart.xField, tick: { fontSize: 12 } };
  const axes = horizontal ? (
    <>
      <CartesianGrid
        strokeDasharray="3 3"
        stroke={COLORS.line}
        horizontal={false}
      />
      <XAxis type="number" {...valueAxis} />
      <YAxis
        type="category"
        {...categoryAxis}
        width={130}
        interval={0}
        tickFormatter={shortName}
      />
    </>
  ) : (
    <>
      <CartesianGrid strokeDasharray="3 3" stroke={COLORS.line} />
      <XAxis {...categoryAxis} tickFormatter={shortName} />
      <YAxis {...valueAxis} width={64} />
    </>
  );
  const overlays = (
    <>
      <Tooltip
        formatter={(v, name) => [tooltipLabel(v, format), shortName(name)]}
        labelFormatter={shortName}
      />
      {drawn.length > 1 && (
        <Legend
          iconType="square"
          iconSize={10}
          wrapperStyle={{ fontSize: 12, paddingTop: 4 }}
          // Neutral text; the swatch carries the color.
          formatter={(value) => (
            <span style={{ color: COLORS.slate }}>{shortName(value)}</span>
          )}
        />
      )}
    </>
  );
  // A function key: place names can contain dots, which Recharts would read
  // as a nested path. The accessor is new each render, which would restart
  // the draw-in animation (and catch PDF export mid-draw), so animation is off.
  const accessor = (key: string) => (d: DataRow) => d[key];

  return (
    <>
      <ResponsiveContainer
        width="100%"
        height={ownNotes.length ? '92%' : '100%'}
      >
        {kind === 'bar' || kind === 'stacked_bar' ? (
          <BarChart {...shared} layout={horizontal ? 'vertical' : 'horizontal'}>
            {axes}
            {overlays}
            {drawn.map((key, i) => (
              <Bar
                key={key}
                name={key}
                dataKey={accessor(key)}
                stackId={stacked ? 'stack' : undefined}
                fill={PALETTE[i % PALETTE.length]}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        ) : kind === 'area' ? (
          <AreaChart {...shared}>
            {axes}
            {overlays}
            {drawn.map((key, i) => (
              <Area
                key={key}
                name={key}
                dataKey={accessor(key)}
                stackId="stack"
                type="linear"
                stroke={PALETTE[i % PALETTE.length]}
                fill={PALETTE[i % PALETTE.length]}
                fillOpacity={0.75}
                isAnimationActive={false}
              />
            ))}
          </AreaChart>
        ) : (
          <LineChart {...shared}>
            {axes}
            {overlays}
            {drawn.map((key, i) => (
              <Line
                key={key}
                name={key}
                dataKey={accessor(key)}
                stroke={PALETTE[i % PALETTE.length]}
                strokeWidth={2}
                dot={{ r: 2 }}
                connectNulls={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        )}
      </ResponsiveContainer>
      {ownNotes.length > 0 && (
        <Text size="xs" c="dimmed">
          {ownNotes.join(' ')}
        </Text>
      )}
    </>
  );
};

// ChartCard treats subtypes starting with "renderTable" as tables: no
// Chart/Table switch, and in PDF mode a card that grows to fit every row.
// Chat tables are saved under this name so a report never clips them.
export const renderTableAgent = AgentChart;

export default AgentChart;
