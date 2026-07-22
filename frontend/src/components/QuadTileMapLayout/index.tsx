/**
 * @since 2026-07-03
 *
 * @description
 *   Shared scaffold for  pages where mapping is only *part* of the content (eg, not exploratory maps(map pages: a fixed-width scrollable sidebar (filters,
 *   legend, ...) next to a main column, in tiles.
 *
 */
'use client';
import { ReactNode } from 'react';
import { Box, Paper, Stack, Title } from '@mantine/core';

interface QuadMapLayoutProps {
  title: string;
  sidebar: ReactNode;
  map: ReactNode;
  tiles: ReactNode[];
}

const tileStyle = {
  position: 'relative' as const,
  borderRadius: 8,
  overflow: 'hidden',
  minHeight: 0,
  minWidth: 0,
};

export default function QuadTileMapLayout({
  title,
  sidebar,
  map,
  tiles,
}: QuadMapLayoutProps) {
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

      <Box
        style={{ flex: 1, minWidth: 0, display: 'flex', gap: 16, minHeight: 0 }}
      >
        <Paper
          withBorder
          radius="md"
          p="md"
          style={{
            flex: 1,
            minWidth: 0,
            alignSelf: 'stretch',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
          }}
        >
          {map}
        </Paper>
        <Stack gap="md" style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>
          {tiles.map((tile, i) => (
            <Paper
              withBorder
              p="md"
              key={i}
              radius="md"
              style={{ flexShrink: 0, minHeight: 240 }}
            >
              {tile}
            </Paper>
          ))}
        </Stack>
      </Box>
    </div>
  );
}
