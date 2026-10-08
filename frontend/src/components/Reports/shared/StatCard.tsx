'use client';

import type { ReactNode } from 'react';
import { Box, Stack, Text } from '@mantine/core';
import { COLORS } from '@/app/theme';
import { COMPARISON_COLOR } from './colors';
import { FORMATS, compare, type FormatKey } from './data';
import { useReport } from './ReportContext';
import { StatCell } from './Section';

const NONE = '—';

function Bar({
  name,
  value,
  max,
  color,
  text,
}: {
  name: string;
  value: number;
  max: number;
  color: string;
  text: string;
}) {
  return (
    <Box>
      <Text size="xs" c="dimmed" mb={12} lh="18px">
        {name.replace(/, Vermont$/, '')} · {text}
      </Text>
      <Box h={8} bg={COLORS.birchDim} style={{ borderRadius: 4 }}>
        <Box
          h={8}
          bg={color}
          style={{
            width: `${max > 0 ? (Math.abs(value) / max) * 100 : 0}%`,
            borderRadius: 4,
          }}
        />
      </Box>
    </Box>
  );
}

/**
 * A primary-vs-benchmark headline: the primary value large, the gap to the
 * benchmark in words, then both values as bars on one scale. Reads the report
 * context, so a new stat is just a variable name and a format.
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
  const max = Math.max(Math.abs(p ?? 0), Math.abs(c ?? 0));

  return (
    <StatCell label={label} icon={icon} value={p !== null ? f.value(p) : NONE}>
      {diff !== null && (
        <Text size="sm" fw={700} lh="20px">
          {f.diff(diff)}
          {pct !== null &&
            ` (${pct > 0 ? '+' : ''}${pct.toFixed(1)}%)`} vs.{' '}
          {ctx.comparison.name.replace(/, Vermont$/, '')}
        </Text>
      )}
      <Stack gap={16} mt={10}>
        {p !== null && (
          <Bar
            name={ctx.primary.name}
            value={p}
            max={max}
            color={ctx.accent}
            text={f.value(p)}
          />
        )}
        {c !== null && (
          <Bar
            name={ctx.comparison.name}
            value={c}
            max={max}
            color={COMPARISON_COLOR}
            text={f.value(c)}
          />
        )}
      </Stack>
    </StatCell>
  );
}
