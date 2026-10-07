'use client';

import type { ReactNode } from 'react';
import { Box, Group, Paper, Progress, Stack, Text } from '@mantine/core';

export type DistributionRow = {
  label: string;
  acres: number;
  pct: number;
  color: string;
};

/** Report card listing acreage per category, each with a share bar. */
export default function DistributionCard({
  title,
  rows,
  footnote,
}: {
  title: string;
  rows: DistributionRow[];
  footnote?: ReactNode;
}) {
  return (
    <Paper withBorder p="xs" radius="sm" bg="var(--mantine-color-body)">
      <Text size="sm" c="dimmed" fw={600} mb="xs">
        {title}
      </Text>
      <Stack gap={6}>
        {rows.map((d) => (
          <Box key={d.label}>
            <Group justify="space-between" mb={2}>
              <Text size="sm" fw={500} lineClamp={1}>
                {d.label}
              </Text>
              <Text size="sm" c="dimmed">
                {Math.round(d.acres).toLocaleString()} ac ({d.pct.toFixed(1)}%)
              </Text>
            </Group>
            <Progress value={d.pct} color={d.color} size="xs" radius="xl" />
          </Box>
        ))}
      </Stack>
      {footnote && (
        <Text size="xs" c="dimmed" mt={6}>
          {footnote}
        </Text>
      )}
    </Paper>
  );
}
