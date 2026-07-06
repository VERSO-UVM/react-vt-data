/**
 * @author Fitz Koch
 * @since 2026-06-25
 *
 * @description
 *   Wrapper function to convert list of filter specifications into filter UI. Passes data up via prop.
 *
 */

import { FilterSpec, FilterValue, filterDef } from './filterTypes';
import { Group, Stack, Button } from '@mantine/core';
import { useForm } from '@mantine/form';
import { FilterUI } from './filterUI';

function filterSpecFactory(def: filterDef): FilterSpec {
  return { filter_table: def.filter_table, filters: {} };
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
          return <FilterUI key={i} style={def.filter_style} params={params} />;
        })}
        <Group grow>
          <Button variant="default" type="button" onClick={() => form.reset()}>
            Reset
          </Button>
          <Button type="submit" disabled={!form.isDirty()}>
            Apply
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
