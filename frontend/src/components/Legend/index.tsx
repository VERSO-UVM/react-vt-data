'use client';
import { Box, Group, Stack, Text } from '@mantine/core';

// One record from a dataset's colors table. The label column is named per
// dataset (e.g. "soil_suitability") so it is read positionally, but every
// legend is expected to carry a hex_color.
export type LegendRow = { hex_color: string } & Record<string, string>;

export type LegendItem = { label: string; color: string };

export default function MapLegend({ items }: { items: LegendItem[] }) {
  if (items.length === 0) return null;

  // Items with no label (ramp midpoints) render as a swatch only, so a
  // sequential ramp reads as one continuous bar.
  return (
    <Stack gap={2} mt="xs">
      {items.map((item, i) => (
        <Group key={i} gap="xs" wrap="nowrap">
          <Box
            w={14}
            h={10}
            style={{
              backgroundColor: item.color,
              borderRadius: 2,
              border: '1px solid rgba(0,0,0,0.15)',
              flexShrink: 0,
            }}
          />
          <Text size="xs" c="dimmed">
            {item.label}
          </Text>
        </Group>
      ))}
    </Stack>
  );
}
