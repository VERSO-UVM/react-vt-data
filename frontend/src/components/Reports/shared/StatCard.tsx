'use client';

import type { ReactNode } from 'react';
import { Group, Text } from '@mantine/core';
import { COMPARISON_COLOR } from './colors';
import { FORMATS, compare, type FormatKey } from './data';
import { useReport } from './ReportContext';
import { StatCell } from './Section';

const NONE = '—';

/**
 * A primary-vs-benchmark headline number: the primary value large, with the
 * benchmark's value and the difference beneath. Reads the report context, so
 * a new stat is just a variable name and a format.
 */
export default function StatCard({
  label,
  icon,
  variable,
  format,
  field = 'Value',
  percentDiff = false,
}: {
  label: string;
  icon: ReactNode;
  variable: string;
  format: FormatKey;
  field?: string;
  percentDiff?: boolean;
}) {
  const ctx = useReport();
  const { p, c, diff } = compare(ctx, variable, field);
  const f = FORMATS[format];
  const pct = percentDiff && diff !== null && c ? (diff / c) * 100 : null;

  return (
    <StatCell label={label} icon={icon} value={p !== null ? f.value(p) : NONE}>
      <Group gap={6} wrap="nowrap">
        <Text size="sm" c={COMPARISON_COLOR}>
          {ctx.comparison.name}: {c !== null ? f.value(c) : NONE}
        </Text>
      </Group>
      {diff !== null && (
        <Text
          size="sm"
          fw={700}
          c={diff > 0 ? 'green.8' : diff < 0 ? 'red.8' : 'dimmed'}
        >
          {f.diff(diff)}
          {pct !== null && ` (${pct > 0 ? '+' : ''}${pct.toFixed(1)}%)`}
        </Text>
      )}
    </StatCell>
  );
}
