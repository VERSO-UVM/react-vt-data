/**
 * @author Fitz Koch
 * @since 2026-06-25
 *
 * @description
 *   Wrapper function to convert list of filter specifications into filter UI. Passes data up via prop.
 *
 */

import { CascadeFilter } from './CascadeUI';
import { FilterSpec, FilterValue, filterDef } from './filterTypes';
import { useState } from 'react';
import ApplyButton from './applybutton';
import { Group } from '@mantine/core';

function filterSpecFactory(def: filterDef): FilterSpec {
  return { filter_table: def.filter_table, filters: {} };
}

interface FilterWrapProps {
  selectData: (v: any) => void;
  dataURL: string;
  filterList: filterDef[];
}

export function FilterWrap(params: FilterWrapProps) {
  const { selectData, dataURL, filterList } = params;
  const [specs, setSpecs] = useState<FilterSpec[]>(
    filterList.map(filterSpecFactory),
  );

  // update the ith spec with new filters via spread {...s, filters}
  const updateSpec = (i: number, filters: Record<string, FilterValue>) =>
    setSpecs((prev) =>
      prev.map((spec, j) => (j === i ? { ...spec, filters } : spec)),
    );

  return (
    <div>
      <Group align="flex-start">
        {filterList.map((def, i) => {
          const common = {
            spec: specs[i],
            setValue: (f: Record<string, FilterValue>) => updateSpec(i, f), // pass down function to update ith spec
          };
          if (def.filter_style === 'Cascade')
            return <CascadeFilter key={i} {...common} />;
        })}
      </Group>
      <ApplyButton dataURL={dataURL} specs={specs} onData={selectData} />
    </div>
  );
}
