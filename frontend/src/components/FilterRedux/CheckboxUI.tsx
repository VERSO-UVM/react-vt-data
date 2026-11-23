import { useEffect, useState } from 'react';
import axios from 'axios';
import { BASE_API_URL } from '@/config';
import {
  ActionIcon,
  Checkbox,
  Divider,
  Group,
  Stack,
  Text,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import { apiFilterParams } from './filterTypes';
import { COLORS } from '@/app/theme';
import { FILTER_GLOSSARY } from './glossary';

/** A term's display text, with an (i) tooltip appended when a plain-language
 *  definition exists for it in this table's FILTER_GLOSSARY entry. Clicks and
 *  Enter/Space on the icon are swallowed so they don't toggle the checkbox
 *  it sits in. It's a focusable span, not a button, because it sits inside
 *  the checkbox's label. */
function TermLabel({ text, table }: { text: string; table: string }) {
  const definition = FILTER_GLOSSARY[table]?.[text];
  if (!definition) return <>{text}</>;

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      {text}
      <Tooltip
        label={definition}
        multiline
        w={260}
        withArrow
        events={{ hover: true, focus: true, touch: true }}
      >
        <ActionIcon
          component="span"
          variant="transparent"
          size="xs"
          c="gray"
          tabIndex={0}
          aria-label={`What does "${text}" mean?`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
        >
          <IconInfoCircle size={14} />
        </ActionIcon>
      </Tooltip>
    </span>
  );
}

/** A small text button for "Select all" / "Select none". */
function TextButton({
  children,
  disabled,
  onClick,
}: {
  children: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <UnstyledButton onClick={onClick} disabled={disabled}>
      <Text
        size="xs"
        fw={500}
        c={disabled ? 'gray.5' : COLORS.spruce}
        td={disabled ? undefined : 'underline'}
      >
        {children}
      </Text>
    </UnstyledButton>
  );
}

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
  }, [spec.filter_table, filterURL]);

  // what happens when we toggle a box
  const handleToggle = (label: string, selections: string[]) => {
    const newFilters = { ...spec.filters };
    newFilters[label] = selections.length === 0 ? [] : selections;
    setValue(newFilters);
  };

  // One section per filter, always open and divided from the next: the
  // whole filter box already opens and closes, so a second layer of
  // collapsing just hides choices.
  return (
    <Stack gap="md">
      {Object.entries(options).map(([label, options], i) => {
        const current = Array.isArray(spec.filters?.[label])
          ? (spec.filters[label] as string[])
          : options;

        const allSelected = current.length === options.length;
        const noneSelected = current.length === 0;

        return (
          <Stack key={label} gap={6}>
            {i > 0 && <Divider />}

            <Group justify="space-between" align="baseline" wrap="nowrap">
              <Text size="sm" fw={600} c={COLORS.ink} truncate>
                <TermLabel text={label} table={spec.filter_table} />
              </Text>
              {/* Red when nothing is selected: the map would be empty. */}
              <Text size="xs" c={noneSelected ? COLORS.red : COLORS.slate}>
                {current.length} of {options.length} selected
              </Text>
            </Group>

            <Group gap="md">
              <TextButton
                disabled={allSelected}
                onClick={() => setValue({ ...spec.filters, [label]: options })}
              >
                Select all
              </TextButton>
              <TextButton
                disabled={noneSelected}
                onClick={() => setValue({ ...spec.filters, [label]: [] })}
              >
                Select none
              </TextButton>
            </Group>

            {/* Long lists scroll inside their own section. */}
            <Stack gap={0} style={{ maxHeight: 240, overflowY: 'auto' }}>
              {options.map((opt) => (
                <Checkbox
                  key={opt}
                  label={<TermLabel text={opt} table={spec.filter_table} />}
                  checked={current.includes(opt)}
                  color={COLORS.spruce}
                  onChange={() => {
                    const selections = current.includes(opt)
                      ? current.filter((item) => item !== opt)
                      : [...current, opt];

                    handleToggle(label, selections);
                  }}
                  size="sm"
                  py={5}
                  radius={3}
                  styles={{
                    label: {
                      fontSize: '0.875rem',
                      color: COLORS.ink,
                      cursor: 'pointer',
                    },
                  }}
                />
              ))}
            </Stack>
          </Stack>
        );
      })}
    </Stack>
  );
}
