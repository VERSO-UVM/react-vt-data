import { useEffect, useState } from 'react';
import { Select, RangeSlider, Stack, Text } from '@mantine/core';
import axios from 'axios';
import { useFilter } from './FilterContext';

type GenericFilterProps = {
  apiURL: string;
};

export default function GenericFilter({ apiURL }: GenericFilterProps) {
  const {
    selectedFilters,
    setSelectedFilters,
    labels,
    setLabels,
    range,
    setRange,
  } = useFilter();
  const [tree, setTree] = useState<any>({});
  const [bounds, setBounds] = useState<[number, number] | null>(null);

  // Load tree + labels
  useEffect(() => {
    if (!apiURL) return;
    axios.get(apiURL).then((r) => {
      setTree(r.data.tree);
      setLabels(r.data.labels || []);
      const firstRange = r.data.ranges?.[0] ?? null;
      setRange(
        firstRange ? { ...firstRange, selected: firstRange.bounds } : null,
      );
    });
  }, [apiURL, setLabels, setSelectedFilters]);

  const numLevels = labels.length;

  const getOptions = (level: number) => {
    let node = tree;
    for (let i = 0; i < level; i++) {
      if (!selectedFilters[i] || !node[selectedFilters[i]]) return [];
      node = node[selectedFilters[i]];
    }
    return ['All', ...Object.keys(node || {})];
  };

  const handleSelect = (level: number, value: string) => {
    const next: Record<number, string> = {};
    for (let i = 0; i < level; i++) next[i] = selectedFilters[i];
    next[level] = value;
    setSelectedFilters(next);
  };

  const getLabel = (level: number) => labels[level] || `Level ${level + 1}`;

  return (
    <Stack gap="sm">
      {Array.from({ length: numLevels }).map((_, level) => (
        <Select
          key={level}
          label={getLabel(level)}
          data={getOptions(level)}
          value={selectedFilters[level] || 'All'}
          onChange={(v) => handleSelect(level, v!)}
          disabled={level > 0 && !selectedFilters[level - 1]}
          searchable
          comboboxProps={{
            withinPortal: true,
          }}
        />
      ))}
      {range && (
        <div>
          <Text size="sm" fw={500}>
            {range.label}
          </Text>
          <RangeSlider
            min={range.bounds[0]}
            max={range.bounds[1]}
            value={range.selected ?? range.bounds}
            onChange={(v) => setRange({ ...range, selected: v })}
          />
        </div>
      )}
    </Stack>
  );
}
