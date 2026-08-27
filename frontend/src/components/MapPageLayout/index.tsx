/**
 * @since 2026-07-03
 *
 * @description
 *   Shared scaffold for map pages: a fixed-width scrollable sidebar (filters,
 *   legend, ...) next to a main column holding the map, with an optional
 *   `below` slot for further visualizations (charts, scatterplots, tables).
 *
 *   When `below` content is present the main column scrolls: the map keeps a
 *   comfortable height and everything after it flows underneath.
 *
 *   Usage:
 *     <MapPageLayout
 *       title="Compare Variables"
 *       sidebar={<><FilterWrap ... />{legend && <BivariateLegend ... />}</>}
 *       map={<VTMap ... />}
 *       below={<MyScatterplot ... />}   // optional
 *     />
 */
'use client';
import { ReactNode } from 'react';
import { Box, Paper, Stack, Title } from '@mantine/core';

interface MapPageLayoutProps {
  title: string;
  sidebar: ReactNode;
  map: ReactNode;
  below?: ReactNode;
}

export default function MapPageLayout({
  title,
  sidebar,
  map,
  below,
}: MapPageLayoutProps) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 16,
        padding: 16,
        height: 'calc(100vh - 80px)',
      }}
    >
      <Paper
        withBorder
        p="md"
        radius="md"
        style={{ width: 340, flexShrink: 0, overflowY: 'auto' }}
      >
        <Title order={4} mb="sm">
          {title}
        </Title>
        {sidebar}
      </Paper>

      <Stack
        gap="md"
        style={{ flex: 1, minWidth: 0, overflowY: below ? 'auto' : 'hidden' }}
      >
        <Box
          style={{
            position: 'relative',
            borderRadius: 8,
            overflow: 'hidden',
            // with content below, the map keeps a fixed comfortable height and
            // the column scrolls; alone, it fills the viewport
            ...(below
              ? { height: '75vh', flexShrink: 0 }
              : { flex: 1, minHeight: 0 }),
          }}
        >
          {map}
        </Box>
        {below}
      </Stack>
    </div>
  );
}
