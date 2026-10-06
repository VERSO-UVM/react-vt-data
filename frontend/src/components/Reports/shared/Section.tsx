'use client';

import { Children, type ReactNode } from 'react';
import { Box, Group, Stack, Text, Title } from '@mantine/core';
import { COLORS } from '@/app/theme';
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
  children,
}: {
  eyebrow: string;
  title: string;
  takeaway?: string;
  children: ReactNode;
}) {
  const { accent } = useReport();
  return (
    <Box
      className="pdf-export-block"
      py={40}
      style={{ borderTop: `1px solid ${COLORS.line}` }}
    >
      <Stack gap={6} mb="xl">
        <Group gap={10}>
          <Box w={28} h={3} bg={accent} style={{ borderRadius: 2 }} />
          <Text size="xs" fw={700} tt="uppercase" lts={1.2} c={accent}>
            {eyebrow}
          </Text>
        </Group>
        <Title order={2}>{title}</Title>
        {takeaway && (
          <Text size="md" c="dimmed" maw={720}>
            {takeaway}
          </Text>
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
  children,
}: {
  title: string;
  note?: string;
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
    <Stack gap={4}>
      <Group gap={8} c={accent}>
        {icon}
        <Text size="xs" fw={700} tt="uppercase" lts={0.8} c="dimmed">
          {label}
        </Text>
      </Group>
      <Title order={2} style={{ fontSize: 34, lineHeight: 1.1 }}>
        {value}
      </Title>
      {children}
    </Stack>
  );
}
