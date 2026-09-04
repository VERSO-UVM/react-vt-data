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
import {
  Accordion,
  Group,
  Text,
  Stack,
  UnstyledButton,
  Divider,
  Checkbox,
} from '@mantine/core';
import { apiFilterParams } from './filterTypes';
import { COLORS } from '@/app/theme';

export function CheckboxFilter(params: apiFilterParams) {
  const { spec, setValue } = params;

  const [options, setOptions] = useState<Record<string, string[]>>({}); // {label: [optionA, optionB...]}
  const query = new URLSearchParams({
    filter_table: spec.filter_table,
  });

  spec.cols?.forEach((col) => {
    query.append('cols', col);
  });

  const filterURL = `${BASE_API_URL}/filters/options?${query.toString()}`;

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
    <Accordion
      multiple
      defaultValue={Object.keys(options)}
      variant="separated"
      chevronPosition="right"
      styles={{
        root: {
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        },
        item: {
          border: '1px solid var(--mantine-color-gray-2)',
          borderRadius: '6px',
          overflow: 'hidden',
          backgroundColor: 'white',
        },
        control: {
          padding: '10px 12px',
          backgroundColor: 'white',
        },
        panel: {
          borderTop: '1px solid var(--mantine-color-gray-2)',
        },
        content: {
          padding: '12px',
        },
      }}
    >
      {Object.entries(options).map(([label, options]) => {
        const current = Array.isArray(spec.filters?.[label])
          ? (spec.filters[label] as string[])
          : options;

        const allSelected = current.length === options.length;
        const noneSelected = current.length === 0;

        return (
          <Accordion.Item key={label} value={label}>
            <Accordion.Control>
              <Group justify="space-between" wrap="nowrap" pr="xs">
                <Text size="sm" fw={500} c="gray.8" truncate>
                  {label}
                </Text>

                <Text size="xs" c={noneSelected ? 'red.6' : 'gray.5'} fw={500}>
                  {current.length} of {options.length}
                </Text>
              </Group>
            </Accordion.Control>

            <Accordion.Panel>
              <Stack gap="xs">
                <Group justify="space-between">
                  <Group gap="xs">
                    <UnstyledButton
                      onClick={() =>
                        setValue({
                          ...spec.filters,
                          [label]: options,
                        })
                      }
                      disabled={allSelected}
                    >
                      <Text
                        size="xs"
                        fw={500}
                        c={allSelected ? 'gray.4' : 'gray.7'}
                      >
                        Select all
                      </Text>
                    </UnstyledButton>

                    <Text size="xs" c="gray.4">
                      /
                    </Text>

                    <UnstyledButton
                      onClick={() =>
                        setValue({
                          ...spec.filters,
                          [label]: [],
                        })
                      }
                      disabled={noneSelected}
                    >
                      <Text
                        size="xs"
                        fw={500}
                        c={noneSelected ? 'gray.4' : 'gray.7'}
                      >
                        Clear
                      </Text>
                    </UnstyledButton>
                  </Group>
                </Group>

                <Divider />

                <Stack gap={0}>
                  {options.map((opt) => (
                    <Checkbox
                      key={opt}
                      label={opt}
                      checked={current.includes(opt)}
                      color={COLORS.spruce}
                      onChange={() => {
                        const selections = current.includes(opt)
                          ? current.filter((item) => item !== opt)
                          : [...current, opt];

                        handleToggle(label, selections);
                      }}
                      size="xs"
                      py={5}
                      radius="3px"
                      styles={{
                        label: {
                          fontSize: '0.8rem',
                          color: 'var(--mantine-color-gray-7)',
                          cursor: 'pointer',
                        },
                      }}
                    />
                  ))}
                </Stack>
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>
        );
      })}
    </Accordion>
  );
}
