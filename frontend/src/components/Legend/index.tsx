'use client';
import { Box, Group, Stack, Text } from '@mantine/core';

// One record from a dataset's colors table. The label column is named per
// dataset (e.g. "soil_suitability") so it is read positionally, but every
// legend is expected to carry a hex_color.
export type LegendRow = { hex_color: string } & Record<string, string>;

export type LegendItem = {
  label: string;
  color: string;
  /** Optional share of the layer this entry makes up, as a percentage. */
  share?: number;
};

export default function MapLegend({ items }: { items: LegendItem[] }) {
  if (items.length === 0) return null;

  return (
    <Stack gap={3}>
      {items.map((item) => (
        <Group key={item.label} gap={8} wrap="nowrap" align="center">
          <Box
            w={14}
            h={14}
            style={{
              backgroundColor: item.color,
              borderRadius: 4,
              border: '1px solid rgba(0,0,0,0.18)',
              flexShrink: 0,
            }}
          />
          <Text size="xs" style={{ flex: 1, lineHeight: 1.3 }}>
            {item.label}
          </Text>
          {item.share !== undefined && (
            <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
              {item.share < 1 ? '<1' : Math.round(item.share)}%
            </Text>
          )}
        </Group>
      ))}
    </Stack>
  );
}
