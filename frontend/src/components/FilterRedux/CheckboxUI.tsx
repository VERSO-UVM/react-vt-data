/**
 * @author Fitz Koch
 * @since 2026-06-29
 *
 * @description
 *   Component style checkbox filter -- calls api to get options, and then presents as groups.
 */

import { useEffect, useState } from 'react';
import axios from 'axios';
import { BASE_API_URL } from '@/config';
import { Checkbox, Stack, SimpleGrid, Paper } from '@mantine/core';
import { apiFilterParams } from './filterTypes';

export function CheckboxFilter(params: apiFilterParams) {
  const { spec, setValue } = params;
  const [options, setOptions] = useState<Record<string, string[]>>({}); // {label: [optionA, optionB...]}
  const filterURL = `${BASE_API_URL}/filters/options?filter_table=${spec.filter_table}`;

  // fetch the raw info for the filter options.
  useEffect(() => {
    if (!spec.filter_table) return;
    axios
      .get(filterURL)
      .then((r) => {
        setOptions(r.data.options);
      })
      .catch((e) => console.error('Labels fetch failed', e));
  }, [filterURL]);

  // what happens when we toggle a box
  const handleToggle = (label: string, selections: string[]) => {
    const newFilters = { ...spec.filters };
    newFilters[label] = selections.length === 0 ? [] : selections;
    setValue({ ...spec.filters, [label]: selections });
  };

  return (
    <Stack gap="md">
      {Object.entries(options).map(([label, options]) => {
        const current = Array.isArray(spec.filters?.[label])
          ? (spec.filters[label] as string[])
          : options;
        return (
          <Paper>
            <Checkbox.Group
              key={label}
              label={label}
              value={current}
              onChange={(selections) => handleToggle(label, selections)}
            >
              <SimpleGrid cols={2} spacing="xs" mt="xs">
                {options.map((o) => (
                  <Checkbox key={o} value={o} label={o} color="teal" />
                ))}
              </SimpleGrid>
            </Checkbox.Group>
          </Paper>
        );
      })}
    </Stack>
  );
}
