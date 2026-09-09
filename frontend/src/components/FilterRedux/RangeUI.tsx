import { useEffect, useState } from 'react';
import axios from 'axios';
import { BASE_API_URL } from '@/config';
import { Stack, Text, RangeSlider } from '@mantine/core';
import { apiFilterParams, FilterValue } from './filterTypes';
import { COLORS } from '@/app/theme';

type RangeDescriptor = { label: string; col: string; bounds: [number, number] };

function isRangeValue(
  v: FilterValue | undefined,
): v is { min: number; max: number } {
  return !!v && !Array.isArray(v);
}

export function RangeFilter(params: apiFilterParams) {
  const { spec, setValue } = params;

  const [ranges, setRanges] = useState<RangeDescriptor[]>([]);
  const query = new URLSearchParams({ filter_table: spec.filter_table });
  spec.cols?.forEach((col) => query.append('cols', col));
  const rangeURL = `${BASE_API_URL}/filters/ranges?${query.toString()}`;

  useEffect(() => {
    if (!spec.filter_table) return;
    axios
      .get(rangeURL)
      .then((r) => setRanges(r.data.ranges))
      .catch((e) => console.error('range bounds fetch failed', e));
  }, [rangeURL]);

  return (
    <Stack gap="lg">
      {ranges.map(({ label, bounds: [min, max] }) => {
        const current = isRangeValue(spec.filters?.[label])
          ? spec.filters[label]
          : { min, max };

        return (
          <Stack key={label} gap={6}>
            <Text size="sm" fw={500} c="gray.8">
              {label}
            </Text>
            <RangeSlider
              min={min}
              max={max}
              step={Math.max((max - min) / 100, 0.01)}
              precision={2}
              value={[current.min, current.max]}
              onChange={([lo, hi]) =>
                setValue({ ...spec.filters, [label]: { min: lo, max: hi } })
              }
              color={COLORS.spruce}
              label={(v) => v.toFixed(2)}
              labelAlwaysOn
              minRange={0}
            />
          </Stack>
        );
      })}
    </Stack>
  );
}
