import { DataRow } from '@/types/cachedCharts';
import type { ReportContextValue } from './ReportContext';

type Fmt = (n: number) => string;

// One place for how each kind of number reads: `value` for the headline and
// tooltips, `diff` for signed differences, `tick` for compact axis labels.
export const FORMATS = {
  int: {
    value: ((n) => n.toLocaleString()) as Fmt,
    diff: ((n) => `${n > 0 ? '+' : ''}${n.toLocaleString()}`) as Fmt,
    tick: ((n) => n.toLocaleString()) as Fmt,
  },
  usd: {
    value: ((n) =>
      `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`) as Fmt,
    diff: ((n) =>
      `${n > 0 ? '+' : n < 0 ? '-' : ''}$${Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 0 })}`) as Fmt,
    tick: ((n) => `$${(n / 1000).toFixed(0)}k`) as Fmt,
  },
  pct: {
    value: ((n) => `${n.toFixed(1)}%`) as Fmt,
    diff: ((n) => `${n > 0 ? '+' : ''}${n.toFixed(1)} pts`) as Fmt,
    tick: ((n) => `${n}%`) as Fmt,
  },
  years: {
    value: ((n) => `${n.toFixed(1)} years`) as Fmt,
    diff: ((n) => `${n > 0 ? '+' : ''}${n.toFixed(1)} yrs`) as Fmt,
    tick: ((n) => n.toFixed(0)) as Fmt,
  },
} as const;

export type FormatKey = keyof typeof FORMATS;

/** First row for `variable`, read from `field`; null if missing/non-numeric. */
export function getValue(
  rows: DataRow[],
  variable: string,
  field = 'Value',
): number | null {
  const row = rows.find((d) => d.Variable === variable);
  if (!row) return null;
  const n = Number(row[field]);
  return Number.isFinite(n) ? n : null;
}

export function compare(
  ctx: ReportContextValue,
  variable: string,
  field = 'Value',
) {
  const p = getValue(ctx.primary.current, variable, field);
  const c = getValue(ctx.comparison.current, variable, field);
  return { p, c, diff: p !== null && c !== null ? p - c : null };
}

/** "Burlington has a higher median age than Vermont (+4.2 yrs)", or undefined. */
export function takeaway(
  ctx: ReportContextValue,
  variable: string,
  noun: string,
  format: FormatKey,
  field = 'Value',
): string | undefined {
  const { diff } = compare(ctx, variable, field);
  if (diff === null) return undefined;
  const a = ctx.primary.name;
  const b = ctx.comparison.name;
  if (diff === 0) return `${a} and ${b} have the same ${noun}.`;
  return `${a} has a ${diff > 0 ? 'higher' : 'lower'} ${noun} than ${b} (${FORMATS[format].diff(diff)}).`;
}
