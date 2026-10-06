'use client';

import { Children, type ReactNode } from 'react';
import { Box, Group, Stack, Text, Title } from '@mantine/core';
import { COLORS } from '@/app/theme';
import { COMPARISON_COLOR } from './colors';
import { useReport } from './ReportContext';

/**
 * One open section of a report: eyebrow, title, optional one-line takeaway,
 * then its content directly on the page. Sections are separated by a hairline
 * rather than boxed, and each one is a PDF export block.
 */
export function ReportSection({
  eyebrow,
  title,
  takeaway,
  intro = false,
  children,
}: {
  eyebrow: string;
  title: string;
  takeaway?: string;
  /** The report's first section: topic + year eyebrow and the places legend. */
  intro?: boolean;
  children: ReactNode;
}) {
  const { accent, topic, year, primary, comparison } = useReport();
  const place = (color: string, name: string, role: string) => (
    <Group gap={8} wrap="nowrap" align="flex-start">
      <Box
        w={10}
        h={10}
        mt={5}
        bg={color}
        style={{ borderRadius: '50%', flexShrink: 0 }}
      />
      <Stack gap={0}>
        <Text size="sm" fw={700} tt="uppercase" lts={0.6}>
          {name.replace(/, Vermont$/, '')}
        </Text>
        <Text size="xs" c="dimmed">
          {role}
        </Text>
      </Stack>
    </Group>
  );

  return (
    <Box
      className="pdf-export-block"
      py={intro ? 28 : 40}
      style={intro ? undefined : { borderTop: `1px solid ${COLORS.line}` }}
    >
      <Stack gap={6} mb="xl">
        <Group gap={10} justify="space-between">
          <Group gap={10}>
            <Box w={28} h={3} bg={accent} style={{ borderRadius: 2 }} />
            <Text size="xs" fw={700} tt="uppercase" lts={1.2} c={accent}>
              {intro ? topic : eyebrow}
            </Text>
          </Group>
          {intro && year > 0 && (
            <Text size="xs" fw={600} c="dimmed">
              ACS {year}
            </Text>
          )}
        </Group>
        <Title order={2}>{title}</Title>
        {takeaway && (
          <Text size="md" c="dimmed" maw={720}>
            {takeaway}
          </Text>
        )}
        {intro && (
          <Group gap={48} mt="sm">
            {place(accent, primary.name, 'Primary')}
            {place(COMPARISON_COLOR, comparison.name, 'Benchmark')}
          </Group>
        )}
      </Stack>
      <Stack gap={40}>{children}</Stack>
    </Box>
  );
}

/** A chart's caption plus the chart, with no surrounding box. */
export function ChartBlock({
  title,
  note,
  insight,
  children,
}: {
  title: string;
  note?: string;
  /** One interpretive sentence between the caption and the chart. */
  insight?: string;
  children: ReactNode;
}) {
  return (
    <Box h="100%">
      <Title order={5} mb={note ? 2 : 'sm'}>
        {title}
      </Title>
      {note && (
        <Text size="xs" c="dimmed" mb="sm">
          {note}
        </Text>
      )}
      {insight && (
        <Text size="sm" mb="sm" maw={560}>
          {insight}
        </Text>
      )}
      {children}
    </Box>
  );
}

const COLS: Record<number, string> = {
  1: 'md:grid-cols-1',
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
  4: 'md:grid-cols-4',
};

/** Headline numbers in one row, divided by hairlines instead of boxed. */
export function StatStrip({ children }: { children: ReactNode }) {
  const cells = Children.toArray(children);
  return (
    <div
      className={`grid grid-cols-1 gap-y-6 md:gap-y-0 ${COLS[Math.min(cells.length, 4)]}`}
    >
      {cells.map((cell, i) => (
        <div
          key={i}
          className={i === 0 ? 'md:pr-8' : 'md:px-8'}
          style={
            i === 0 ? undefined : { borderLeft: `1px solid ${COLORS.line}` }
          }
        >
          {cell}
        </div>
      ))}
    </div>
  );
}

/** A label, a big value, and optional supporting lines. */
export function StatCell({
  label,
  value,
  icon,
  children,
}: {
  label: string;
  value: string;
  icon?: ReactNode;
  children?: ReactNode;
}) {
  const { accent } = useReport();
  return (
    <Stack gap={10}>
      <Group gap={8} c={accent}>
        {icon}
        <Text size="xs" fw={700} tt="uppercase" lts={0.8} c="dimmed">
          {label}
        </Text>
      </Group>
      <Title order={2} style={{ fontSize: 34, lineHeight: '42px' }}>
        {value}
      </Title>
      {children}
    </Stack>
  );
}
