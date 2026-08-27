/**
 * @author Fitz Koch
 * @since 2026-07-22
 *
 * @description
 *   scratch page; purely lists previous stuff.
 */

import { useEffect, useState } from 'react';
import axios from 'axios';
import { BASE_API_URL } from '@/config';
import { Accordion, Group, Text, Badge, Chip } from '@mantine/core';
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
    setValue(newFilters);
  };

  return (
    <Accordion multiple defaultValue={Object.keys(options)}>
      {Object.entries(options).map(([label, options]) => {
        const current = Array.isArray(spec.filters?.[label])
          ? (spec.filters[label] as string[])
          : options;
        return (
          <Accordion.Item key={label} value={label}>
            <Accordion.Control>
              <Group justify="space-between" pr="sm">
                <Text fw={500}>{label} </Text>
                <Badge>
                  {current.length} / {options.length}
                </Badge>
              </Group>
            </Accordion.Control>
            <Accordion.Panel>
              <Chip.Group
                multiple
                value={current}
                onChange={(selections) => handleToggle(label, selections)}
              >
                <Group gap="xs">
                  {options.map((opt) => (
                    <Chip
                      key={opt}
                      value={opt}
                      color="teal"
                      variant="light"
                      size="xs"
                    >
                      {opt}
                    </Chip>
                  ))}
                </Group>
              </Chip.Group>
            </Accordion.Panel>
          </Accordion.Item>
        );
      })}
    </Accordion>
  );
}
