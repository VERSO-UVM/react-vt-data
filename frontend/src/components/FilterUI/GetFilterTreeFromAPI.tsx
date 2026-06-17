import { useEffect, useState } from 'react';
import { Select, Group, Stack } from '@mantine/core';
import axios from 'axios';
import { useFilter } from './FilterContext';

type GenericFilterProps = {
  apiURL: string;
};

export default function GenericFilter({ apiURL }: GenericFilterProps) {
  const { selectedFilters, setSelectedFilters, labels, setLabels } =
    useFilter();
  const [tree, setTree] = useState<any>({});

  // Load tree + labels
  useEffect(() => {
    if (!apiURL) return;
    axios.get(apiURL).then((r) => {
      setTree(r.data.tree);
      setLabels(r.data.labels || []);
      setSelectedFilters({});
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
    </Stack>
  );
}
