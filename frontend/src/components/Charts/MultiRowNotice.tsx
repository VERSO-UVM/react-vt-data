'use client';

import { useEffect } from 'react';
import { Badge, Text } from '@mantine/core';

// Shown above a trend chart whose series had more than one row for some
// year (see seriesLines.ts). Every row is drawn as its own line, so the
// note just says why there are extra lines. In development it's louder: a
// console warning and a yellow badge, so a pipeline bug that floods a chart
// with rows gets noticed right away. A warning, not an error: several rows
// can be legitimate (e.g. owner costs with and without a mortgage).

const IS_DEV = process.env.NODE_ENV !== 'production';

export default function MultiRowNotice({
  chartTitle,
  maxPerYear,
}: {
  chartTitle: string;
  /** The most rows any one year had across the chart's series. */
  maxPerYear: number;
}) {
  const split = maxPerYear > 1;

  useEffect(() => {
    if (IS_DEV && split) {
      console.warn(
        `[trend chart] "${chartTitle}" got up to ${maxPerYear} rows for one ` +
          'year of a single series; each is drawn as its own line.',
      );
    }
  }, [split, chartTitle, maxPerYear]);

  if (!split) return null;
  return IS_DEV ? (
    <Badge color="yellow" variant="light" mb={4}>
      Dev: up to {maxPerYear} values per year in one series
    </Badge>
  ) : (
    <Text size="xs" c="dimmed" mb={4}>
      Some years have more than one value for this item; each is drawn as its
      own line.
    </Text>
  );
}
