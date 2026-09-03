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
import { COLORS, FONTS } from '@/app/theme';

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
      const selVal = Array.isArray(sel) ? sel[0] : null;
      if (selVal == null || node?.[selVal] == null) return [];
      node = node[selVal];
    }
    return ['All', ...Object.keys(node ?? {})];
  };

  return (
    <Stack gap={18}>
      {labels.map((label, i) => (
        <Select
          key={label}
          label={label}
          data={getOptions(label)}
          value={(spec.filters?.[label] as string[])?.[0] ?? 'All'}
          onChange={(v) => handleSelect(label, v!)}
          disabled={i > 0 && spec.filters?.[labels[i - 1]] == null}
          searchable
          radius="sm"
          size="md"
          styles={{
            label: {
              fontFamily: FONTS.body,
              fontSize: '0.875rem',
              fontWeight: 500,
              color: COLORS.ink,
              marginBottom: 7,
            },

            input: {
              backgroundColor: COLORS.birch,
              border: `1px solid ${COLORS.line}`,
              color: COLORS.ink,
              fontFamily: FONTS.body,
              fontSize: '0.9rem',
              minHeight: 42,
              transition: 'border-color 150ms ease',
            },

            section: {
              color: COLORS.slate,
            },

            dropdown: {
              backgroundColor: COLORS.birch,
              border: `1px solid ${COLORS.line}`,
              borderRadius: 6,
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.06)',
              overflow: 'hidden',
            },

            option: {
              fontFamily: FONTS.body,
              fontSize: '0.875rem',
              color: COLORS.ink,
              padding: '9px 12px',
            },
          }}
        />
      ))}
    </Stack>
  );
}
