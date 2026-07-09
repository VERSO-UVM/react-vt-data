/**
 * @author Fitz Koch
 * @since 2026-06-25
 *
 * @description
 *   Component style Cascade Filter, which calls API to get filter options,
 *   lets user navigate options, and updates parent with current filter selection
 */

import { useEffect, useState } from 'react';
import { FilterTree, apiFilterParams } from './filterTypes';
import axios from 'axios';
import { BASE_API_URL } from '@/config';
import { Select, Stack } from '@mantine/core';

export function CascadeFilter(params: apiFilterParams) {
  const { spec, setValue } = params;
  const [tree, setTree] = useState<FilterTree>({});
  const [labels, setLabels] = useState<string[]>([]);
  const filterURL = `${BASE_API_URL}/filters/tree?filter_table=${spec.filter_table}`;

  // fetch the raw info for the filter tree.
  useEffect(() => {
    if (!spec.filter_table) return;
    axios
      .get(filterURL)
      .then((r) => {
        setTree(r.data.tree);
        setLabels(r.data.labels || []);
      })
      .catch((e) => console.error('tree fetch failed', e));
  }, [filterURL]);

  // what happens when we select a value in the box
  // (we update our filters and push them up to parent)
  const handleSelect = (label: string, value: string) => {
    const idx = labels.indexOf(label);
    const newFilters = { ...spec.filters };
    if (value === 'All') {
      delete newFilters[label];
    } else newFilters[label] = [value];
    labels.slice(idx + 1).forEach((col: string) => delete newFilters[col]); // clear downstream
    setValue(newFilters);
  };

  // walk down our tree of options to get keys at that level
  const getOptions = (label: string): string[] => {
    const idx = labels.indexOf(label);
    let node = tree;
    for (let i = 0; i < idx; i++) {
      const sel = spec.filters?.[labels[i]];
      const selVal = Array.isArray(sel) ? sel[0] : null; // get string from string[]
      if (selVal == null || node?.[selVal] == null) return [];
      node = node[selVal];
    }
    return ['All', ...Object.keys(node ?? {})];
  };

  return (
    <Stack gap="sm">
      {labels.map((label, i) => (
        <Select
          key={label}
          label={label}
          data={getOptions(label)}
          value={(spec.filters?.[label] as string[])?.[0] ?? 'All'}
          onChange={(v) => handleSelect(label, v!)}
          disabled={i > 0 && spec.filters?.[labels[i - 1]] == null}
          searchable
        />
      ))}
    </Stack>
  );
}
