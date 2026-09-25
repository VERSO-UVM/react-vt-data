'use client';

import { useEffect } from 'react';
import { Badge, Text } from '@mantine/core';

// Shown above a trend chart whose series had more than one row for some
// year (see seriesLines.ts). Every row is drawn as its own line, and a short
// note says why there are extra lines: several values under one label can
// be real (e.g. owner costs with and without a mortgage). Rows that exactly
// repeat another are different: never real data, so in development they
// raise a console error and a red badge, to catch pipeline bugs early.

const IS_DEV = process.env.NODE_ENV !== 'production';

export default function MultiRowNotice({
  chartTitle,
  maxPerYear,
  duplicates,
}: {
  chartTitle: string;
  /** The most rows any one year had across the chart's series. */
  maxPerYear: number;
  /** Rows exactly repeating another row, across the chart's series. */
  duplicates: number;
}) {
  useEffect(() => {
    if (IS_DEV && duplicates > 0) {
      console.error(
        `[trend chart] "${chartTitle}" got ${duplicates} row(s) that exactly ` +
          'repeat another row; likely duplicated data in the pipeline.',
      );
    }
  }, [chartTitle, duplicates]);

  return (
    <>
      {IS_DEV && duplicates > 0 && (
        <Badge color="red" variant="light" mb={4}>
          Dev: {duplicates} duplicate row{duplicates === 1 ? '' : 's'}
        </Badge>
      )}
      {maxPerYear > 1 && (
        <Text size="xs" c="dimmed" mb={4}>
          Some years have more than one value for this item; each is drawn as
          its own line.
        </Text>
      )}
    </>
  );
}
