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
import {
  Select,
  Stack,
  Group,
  ActionIcon,
  Badge,
  Tooltip as MantineTooltip,
} from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import { COLORS, FONTS } from '@/app/theme';

// Short tag shown next to a Measure flagged as a key health indicator
// (this project's curated "SME" list drawn from CDC PLACES/BRFSS notes),
// instead of forcing everyone through a separate True/False cascade level
// just to spot them.
const BADGE_TOOLTIPS: Record<string, string> = {
  Measure:
    'One of this dataset’s curated Population Health Indicators — ' +
    'a key measure drawn from CDC PLACES/BRFSS notes.',
};

// CDC publishes exactly one "Crude prevalence" and one "Age-adjusted
// prevalence" row per measure -- leaving this level at "All" doesn't mean
// "no restriction", it means both rows come back and get merged as if they
// were independent geographies. So this level skips "All" and instead
// defaults to age-adjusted, matching the backend's own fallback.
const NO_ALL_LABELS = new Set(['Prevalence Measure']);
const DEFAULT_VALUES: Record<string, string> = {
  'Prevalence Measure': 'Age-adjusted prevalence',
};

// Wording sourced directly from CDC/NCHS:
// - "Age Adjustment" (Health, United States, sources & definitions):
//   https://www.cdc.gov/nchs/hus/sources-definitions/age-adjustment.htm
//   ("removes the effects of age when comparing populations with different
//   age distributions... using the projected year 2000 U.S. standard
//   population")
// - PLACES "Using the Data" FAQ, on why smaller geographies use crude rates:
//   https://www.cdc.gov/places/faqs/using-data/index.html
//   ("age-adjusted estimates are only available at the county and
//   place-level"; tract/ZCTA lack population for every age group the
//   adjustment needs)
const TOOLTIPS: Record<string, string> = {
  'Prevalence Measure':
    'Crude prevalence is the rate actually observed. Age-adjusted prevalence ' +
    'reweights it to the 2000 U.S. standard population, per CDC/NCHS, so an ' +
    "area's rate isn't just reflecting an older or younger population. CDC " +
    'PLACES publishes age-adjusted estimates at the county level; smaller ' +
    'areas use crude prevalence because they lack population counts for ' +
    'every age group the adjustment needs.',
};

export function CascadeFilter(params: apiFilterParams) {
  const { spec, setValue } = params;
  const [tree, setTree] = useState<FilterTree>({});
  const [labels, setLabels] = useState<string[]>([]);
  const [badges, setBadges] = useState<Record<string, string[]>>({});
  const filterURL = `${BASE_API_URL}/filters/tree?filter_table=${spec.filter_table}`;

  // fetch the raw info for the filter tree.
  useEffect(() => {
    if (!spec.filter_table) return;
    axios
      .get(filterURL)
      .then((r) => {
        setTree(r.data.tree);
        setLabels(r.data.labels || []);
        setBadges(r.data.badges || {});
      })
      .catch((e) => console.error('tree fetch failed', e));
  }, [filterURL]);

  // Whenever the tree changes -- e.g. the geography level toggle swaps CDC's
  // filter table between county and tract, which changes what Prevalence
  // Measure offers but leaves Category/Measure untouched -- keep whatever
  // picks are still valid instead of wiping the whole chain. Only the first
  // level whose selected value doesn't exist in the new tree (and everything
  // below it) gets cleared, the same as picking a new value by hand does.
  useEffect(() => {
    if (!labels.length) return;
    let node: FilterTree = tree;
    let staleFrom = -1;
    for (let i = 0; i < labels.length; i++) {
      const sel = spec.filters?.[labels[i]];
      const selVal = Array.isArray(sel) ? sel[0] : undefined;
      if (selVal == null) break; // nothing picked at/after this level yet
      if (node?.[selVal] == null) {
        staleFrom = i;
        break;
      }
      node = node[selVal] ?? {};
    }
    if (staleFrom === -1) return;
    const newFilters = { ...spec.filters };
    labels.slice(staleFrom).forEach((col) => delete newFilters[col]);
    setValue(newFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tree, labels]);

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
    const keys = Object.keys(node ?? {});
    return NO_ALL_LABELS.has(label) ? keys : ['All', ...keys];
  };

  // levels that skip "All" need an explicit pick as soon as they become
  // available -- otherwise they'd render with no selection at all.
  useEffect(() => {
    labels.forEach((label, i) => {
      if (!NO_ALL_LABELS.has(label)) return;
      if (spec.filters?.[label]) return;
      const parent = labels[i - 1];
      if (parent && spec.filters?.[parent] == null) return;
      const options = getOptions(label);
      const fallback = DEFAULT_VALUES[label];
      const preferred =
        fallback && options.includes(fallback) ? fallback : options[0];
      if (preferred) handleSelect(label, preferred);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tree, labels, spec.filters]);

  return (
    <Stack gap={18}>
      {labels.map((label, i) => {
        const flagged = new Set(badges[label] ?? []);
        return (
          <Select
            key={label}
            label={
              TOOLTIPS[label] ? (
                <Group gap={4} wrap="nowrap">
                  <span>{label}</span>
                  <MantineTooltip
                    label={TOOLTIPS[label]}
                    multiline
                    w={260}
                    withArrow
                  >
                    <ActionIcon
                      variant="transparent"
                      size="xs"
                      c={COLORS.slate}
                      style={{ cursor: 'help' }}
                    >
                      <IconInfoCircle size={14} stroke={1.5} />
                    </ActionIcon>
                  </MantineTooltip>
                </Group>
              ) : (
                label
              )
            }
            data={getOptions(label)}
            value={
              (spec.filters?.[label] as string[])?.[0] ??
              (NO_ALL_LABELS.has(label) ? null : 'All')
            }
            onChange={(v) => handleSelect(label, v!)}
            disabled={i > 0 && spec.filters?.[labels[i - 1]] == null}
            renderOption={
              flagged.size
                ? ({ option }) => (
                    <Group
                      gap={6}
                      justify="space-between"
                      flex={1}
                      wrap="nowrap"
                    >
                      <span>{option.label}</span>
                      {flagged.has(option.value) && (
                        <MantineTooltip
                          label={BADGE_TOOLTIPS[label]}
                          multiline
                          w={220}
                          withArrow
                        >
                          <Badge
                            size="xs"
                            variant="light"
                            color={COLORS.spruce}
                            style={{ flexShrink: 0 }}
                          >
                            Health Indicator
                          </Badge>
                        </MantineTooltip>
                      )}
                    </Group>
                  )
                : undefined
            }
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
        );
      })}
    </Stack>
  );
}
