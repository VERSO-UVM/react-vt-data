// ACS estimates come from a survey sample, so each carries a 90% margin of
// error (MOE): the true value is likely within estimate ± MOE. The API sends a
// field's margin as `<field>_MOE` and its reliability label (high, medium or
// low, from the estimate's coefficient of variation; see
// backend/data_cleaning/margins.py) as `<field>_Reliability`.

import { Area } from 'recharts';
import { Text } from '@mantine/core';
import { DataRow } from '@/types/cachedCharts';

export type Reliability = 'high' | 'medium' | 'low';

/** The API fields holding `field`'s margin of error and reliability label. */
export const moeField = (field: string) => `${field}_MOE`;
export const reliabilityField = (field: string) => `${field}_Reliability`;

/** Whether any row carries a margin for `field`. */
export const hasMargins = (rows: DataRow[] | undefined, field: string) =>
  !!rows?.some((r) => r[moeField(field)] != null);

// Plot rows keep a value's margin and reliability under keys derived from the
// value's key, ahead of any " (cmp)" suffix so the table view still pairs a
// comparison margin with its comparison value: "Under 18" -> "Under 18 MOE",
// "Under 18 (cmp)" -> "Under 18 MOE (cmp)".
const CMP_SUFFIX = ' (cmp)';
const MOE_SUFFIX = ' MOE';
const RELIABILITY_SUFFIX = ' Reliability';

const withoutCmp = (key: string) =>
  key.endsWith(CMP_SUFFIX) ? key.slice(0, -CMP_SUFFIX.length) : key;
const withSuffix = (key: string, suffix: string) =>
  key.endsWith(CMP_SUFFIX)
    ? `${withoutCmp(key)}${suffix}${CMP_SUFFIX}`
    : `${key}${suffix}`;

export const moeKey = (key: string) => withSuffix(key, MOE_SUFFIX);
export const reliabilityKey = (key: string) =>
  withSuffix(key, RELIABILITY_SUFFIX);

/** Whether a plot-row key holds a margin or reliability label, not a value. */
export const isMarginKey = (key: string) => {
  const base = withoutCmp(key);
  return base.endsWith(MOE_SUFFIX) || base.endsWith(RELIABILITY_SUFFIX);
};

/** Puts a row's `field` on a plot point under `key`, and when the chart has
 *  margins, the row's margin and reliability alongside it. */
export const plotValue = (
  pt: DataRow,
  key: string,
  row: DataRow | undefined,
  field: string,
  margins: boolean,
) => {
  pt[key] = row?.[field] ?? null;
  if (!margins) return;
  pt[moeKey(key)] = row?.[moeField(field)] ?? null;
  pt[reliabilityKey(key)] = row?.[reliabilityField(field)] ?? null;
};

/** The likely range, estimate ± margin, kept to values the measure can take.
 *  Every ACS measure with a margin is a count, dollar amount, age or share, so
 *  none goes below zero, and shares stay at or under 100% (a 100% share in a
 *  tiny tract can carry a ±257 margin). */
export const interval = (
  value: number,
  moe: number,
  percent: boolean,
): [number, number] => [
  Math.max(0, value - moe),
  percent ? Math.min(100, value + moe) : value + moe,
];

/** The interval around a plot point's value under `key`, or null when either
 *  the value or its margin is missing. */
export const intervalAt = (pt: DataRow, key: string, percent: boolean) => {
  const value = pt[key];
  const moe = pt[moeKey(key)];
  return typeof value === 'number' && typeof moe === 'number'
    ? interval(value, moe, percent)
    : null;
};

/** The margin of a sum: the root sum of squares of its parts' margins (Census
 *  ACS handbook). Summing shares of one total this way runs slightly wide,
 *  never narrow, since it leaves out the shared denominator. */
export const sumMoe = (moes: unknown[]) =>
  moes.every((m) => typeof m === 'number')
    ? Math.sqrt((moes as number[]).reduce((sum, m) => sum + m * m, 0))
    : null;

// The cut points backend/data_cleaning/margins.py uses, for values the
// frontend derives itself: a coefficient of variation under 15% is high
// reliability, over 30% low.
const Z_90 = 1.645;

export const reliabilityOf = (
  estimate: number | null,
  moe: number | null,
): Reliability | null => {
  if (estimate == null || moe == null) return null;
  if (moe === 0) return 'high';
  if (estimate === 0) return 'low';
  const cv = moe / Z_90 / Math.abs(estimate);
  return cv < 0.15 ? 'high' : cv <= 0.3 ? 'medium' : 'low';
};

/** Whether any value in the plot rows has low reliability. Comparison values
 *  count only `withCmp`, since tables hide them until asked. */
export const anyLowReliability = (rows: DataRow[], withCmp = true) =>
  rows.some((pt) =>
    Object.entries(pt).some(
      ([k, v]) =>
        v === 'low' &&
        (withCmp || !k.endsWith(CMP_SUFFIX)) &&
        withoutCmp(k).endsWith(RELIABILITY_SUFFIX),
    ),
  );

/** "value ± margin" for a tooltip or table cell, plus `lowFlag` when the
 *  estimate has low reliability. Without a margin, just the value. A
 *  no-break space keeps "± margin" together when a narrow cell wraps. */
export const withMargin = (
  text: string,
  moe: unknown,
  reliability: unknown,
  formatMoe: (moe: number) => string,
  lowFlag: string,
) =>
  typeof moe === 'number'
    ? `${text} ±\u00a0${formatMoe(moe)}${reliability === 'low' ? lowFlag : ''}`
    : text;

/** Which field a tidy-table row's cell shows: its share or its count. */
export type FieldOf = (row: DataRow | undefined) => 'Percent' | 'Value';

const formatField = (field: 'Percent' | 'Value', v: number) =>
  field === 'Percent' ? `${v.toFixed(1)}%` : v.toLocaleString();

/** A tidy-table cell: the value `fieldOf` picks, with its margin of error and
 *  an asterisk for a low-reliability estimate. The on-screen tables and the
 *  PDF report's own table renderer both use it, so they read the same. */
export const cellText = (row: DataRow | undefined, fieldOf: FieldOf) => {
  const field = fieldOf(row);
  const value = row?.[field];
  if (typeof value !== 'number') return '—';
  return withMargin(
    formatField(field, value),
    row?.[moeField(field)],
    row?.[reliabilityField(field)],
    (m) => formatField(field, m),
    '*',
  );
};

/** The margin (`moeField`) or reliability label (`reliabilityField`) of the
 *  value a tidy-table row's cell shows. */
export const cellCompanion = (
  row: DataRow | undefined,
  fieldOf: FieldOf,
  name: (field: string) => string,
) => {
  const field = fieldOf(row);
  return row && row[field] != null ? (row[name(field)] ?? null) : null;
};

/** Whether the cells for `rows` show any margin, and any low-reliability
 *  estimate: what a table's footnote needs to explain. */
export const cellMarginFlags = (rows: DataRow[], fieldOf: FieldOf) => ({
  margins: rows.some((r) => cellCompanion(r, fieldOf, moeField) != null),
  lowReliability: rows.some(
    (r) => cellCompanion(r, fieldOf, reliabilityField) === 'low',
  ),
});

// A CV over 30% means a margin of at least 0.30 × 1.645 ≈ half the estimate.
const LOW_RELIABILITY =
  'Low reliability: the margin of error is about half the estimate or more.';

/** The footnote text for a table with margins. */
export const marginFootnote = (lowReliability: boolean) =>
  '± is the margin of error: the true value is likely (90%) within that ' +
  `range.${lowReliability ? ` * ${LOW_RELIABILITY}` : ''}`;

// Recharts draws a lone point's dot even with dot={false}; for a band, that
// would be a faint stray dot at the top of the range.
const noDot = () => <g />;

/** The shaded range behind a trend line. Call it as a function inside the
 *  chart, not as a component, so Recharts sees the Area itself. */
export const marginBand = ({
  dataKey,
  color,
  percent,
  hide,
  type = 'linear',
}: {
  dataKey: string;
  color: string;
  percent: boolean;
  hide?: boolean;
  type?: 'linear' | 'monotone';
}) => (
  <Area
    key={`${dataKey} band`}
    type={type}
    dataKey={(pt: DataRow) => intervalAt(pt, dataKey, percent)}
    stroke="none"
    fill={color}
    fillOpacity={0.15}
    legendType="none"
    tooltipType="none"
    dot={noDot}
    activeDot={false}
    isAnimationActive={false}
    hide={hide}
  />
);

/** A trend line's dots: hollow where the estimate has low reliability, and
 *  solid at every other point only when `allDots` (split series show them). */
export const reliabilityDots = (
  dataKey: string,
  color: string,
  allDots: boolean,
) =>
  function ReliabilityDot({
    cx,
    cy,
    index,
    payload,
    points,
  }: {
    cx?: number;
    cy?: number;
    index?: number;
    payload?: DataRow;
    points?: readonly unknown[];
  }) {
    const low = payload?.[reliabilityKey(dataKey)] === 'low';
    // Recharts draws no line through a single point, so its dot is the only
    // mark the series gets.
    const only = points?.length === 1;
    if (cx == null || cy == null || (!low && !allDots && !only))
      return <g key={index} />;
    return (
      <circle
        key={index}
        cx={cx}
        cy={cy}
        r={low ? 4 : 3}
        fill={low ? '#fff' : color}
        stroke={color}
        strokeWidth={2}
      />
    );
  };

/** The caption for a chart with margins: shaded bands behind trend lines, or
 *  whiskers on bars. */
export const MarginNote = ({
  lowReliability,
  bars = false,
}: {
  lowReliability: boolean;
  bars?: boolean;
}) => (
  <Text size="xs" c="dimmed" mb={4}>
    {bars ? 'The black line on each bar shows' : 'Shading shows'} the margin of
    error: the true value is likely (90%) within it.
    {lowReliability &&
      (bars
        ? ' Hover over a bar to see whether its estimate has low reliability.'
        : ' Hollow dots mark low-reliability estimates, whose margin is about half the estimate or more.')}
  </Text>
);

/** The footnote for a table with margins. */
export const MarginFootnote = ({
  lowReliability,
}: {
  lowReliability: boolean;
}) => (
  <Text size="xs" c="dimmed" mt={4}>
    {marginFootnote(lowReliability)}
  </Text>
);

/** A comparison map tooltip's margins, keyed by measure: the backend
 *  (query/comparison.py) sends them under this key beside the values. */
const TOOLTIP_MARGINS = '__margins__';
type TooltipMargins = Record<
  string,
  { moe: number; reliability: Reliability | null }
>;

/** Whether a map tooltip key holds data for the card (`__title__`,
 *  `__margins__`) rather than a field to list. */
export const isTooltipMeta = (key: string) =>
  key.startsWith('__') && key.endsWith('__');

const tooltipMargin = (tooltip: Record<string, unknown>, key: string) =>
  (tooltip[TOOLTIP_MARGINS] as TooltipMargins | undefined)?.[key];

/** A map tooltip field's value as "value ± margin" when the tooltip carries
 *  its margin; otherwise the value as is. */
export const withTooltipMargin = (
  tooltip: Record<string, unknown>,
  key: string,
  value: unknown,
) => {
  const margin = tooltipMargin(tooltip, key);
  return margin
    ? withMargin(
        String(value),
        margin.moe,
        margin.reliability,
        (m) => m.toLocaleString(),
        ' (low reliability)',
      )
    : value;
};

/** Whether any value in a map tooltip has low reliability. */
export const tooltipLowReliability = (tooltip: Record<string, unknown>) =>
  Object.values(
    (tooltip[TOOLTIP_MARGINS] as TooltipMargins | undefined) ?? {},
  ).some((m) => m.reliability === 'low');
