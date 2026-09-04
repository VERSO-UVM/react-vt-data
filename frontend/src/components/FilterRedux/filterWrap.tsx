/**
 * @author Fitz Koch
 * @since 2026-06-25
 *
 * @description
 *   Wrapper function to convert list of filter specifications into filter UI. Passes data up via prop.
 *
 */

import { FilterSpec, FilterValue, filterDef } from './filterTypes';
import { Group, Stack, Button, Fieldset } from '@mantine/core';
import { useForm } from '@mantine/form';
import { FilterUI } from './filterUI';
import { COLORS } from '@/app/theme';

function filterSpecFactory(def: filterDef): FilterSpec {
  return { filter_table: def.filter_table, filters: {}, cols: def.cols };
}

interface FilterWrapProps {
  handleApply: (specs: FilterSpec[]) => void;
  filterList: filterDef[];
}

export function FilterWrap(props: FilterWrapProps) {
  const { handleApply, filterList } = props;

  const form = useForm<{ specs: FilterSpec[] }>({
    initialValues: { specs: filterList.map(filterSpecFactory) },
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
          return (
            <Fieldset
              key={i}
              legend={def.label ?? `Filter ${i + 1}`}
              radius="md"
            >
              <FilterUI style={def.filter_style} params={params} />
            </Fieldset>
          );
        })}
        <Group grow>
          <Button variant="default" type="button" onClick={() => form.reset()}>
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
