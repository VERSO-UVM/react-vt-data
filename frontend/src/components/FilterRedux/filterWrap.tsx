/**
 * @author Fitz Koch
 * @since 2026-06-25
 *
 * @description
 *   Wrapper function to convert list of filter specifications into filter UI. Passes data up via prop.
 *
 */

import { FilterSpec, FilterValue, filterDef } from './filterTypes';
import { Group, Stack, Button, Fieldset, Box } from '@mantine/core';
import { useForm } from '@mantine/form';
import { FilterUI } from './filterUI';
import { COLORS } from '@/app/theme';

function filterSpecFactory(def: filterDef, seed?: FilterSpec): FilterSpec {
  return {
    filter_table: def.filter_table,
    filters: seed?.filters ?? {},
    cols: def.cols,
  };
}

interface FilterWrapProps {
  handleApply: (specs: FilterSpec[]) => void;
  filterList: filterDef[];
  /** Initial filter values (same order as filterList) to seed the form with,
   *  e.g. from a use-case preset. Pass a changing `key` on FilterWrap to
   *  force a remount when these should be re-applied. */
  initialSpecs?: FilterSpec[];
  /** When true, Checkbox/Cascade fieldsets become read-only — used while a
   *  preset is active, so its defining filters can't be edited out from
   *  under it. Range sliders stay interactive: narrowing a numeric bound
   *  can only shrink the result set, not change what the preset means, so
   *  there's no need to lock those too. */
  locked?: boolean;
}

export function FilterWrap(props: FilterWrapProps) {
  const { handleApply, filterList, initialSpecs, locked = false } = props;

  const form = useForm<{ specs: FilterSpec[] }>({
    initialValues: {
      specs: filterList.map((def, i) =>
        filterSpecFactory(def, initialSpecs?.[i]),
      ),
    },
  });

  return (
    <form onSubmit={form.onSubmit((v) => handleApply(v.specs))}>
      <Stack gap="md">
        {filterList.map((def, i) => {
          const params = {
            spec: form.values.specs[i],
            setValue: (f: Record<string, FilterValue>) =>
              form.setFieldValue(`specs.${i}.filters`, f),
          };
          const fieldLocked = locked && def.filter_style !== 'Range';
          return (
            <Fieldset
              key={i}
              legend={def.label ?? `Filter ${i + 1}`}
              radius="md"
            >
              <Box
                style={{
                  pointerEvents: fieldLocked ? 'none' : 'auto',
                  opacity: fieldLocked ? 0.55 : 1,
                }}
              >
                <FilterUI style={def.filter_style} params={params} />
              </Box>
            </Fieldset>
          );
        })}
        <Group grow>
          <Button
            variant="default"
            type="button"
            onClick={() => form.reset()}
            disabled={locked}
          >
            Reset
          </Button>
          <Button
            type="submit"
            disabled={!form.isDirty()}
            color={COLORS.spruce}
          >
            Apply
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
