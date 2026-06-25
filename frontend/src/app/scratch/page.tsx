'use client';
import { Center, Title, Box } from '@mantine/core';
import { useState } from 'react';
import { BASE_API_URL } from '@/config';
import FilterContainer from '@/components/FilterUI/Filter_wrap';
import { FilterProvider } from '@/components/FilterUI/FilterContext';
import VTMap from '@/components/mapping';
import { CascadeFilter } from '@/components/FilterRedux/CascadeUI';
import { FilterSpec } from '@/components/FilterRedux/filterTypes';
import ApplyButton from '@/components/FilterRedux/applybutton';
import { cdc_filtering } from '@/components/FilterRedux/filterDefs';

import { FilterWrap } from '@/components/FilterRedux/filterWrap';

export default function Scratch() {
  const [spec, setSpec] = useState<FilterSpec>({
    filter_table: 'zoning_info',
    filters: {},
  });

  const [data, setData] = useState<{}>({});

  return (
    <div>
      <FilterWrap
        selectData={setData}
        dataURL={`${BASE_API_URL}/load/mapping/cdc/places/double_new`}
        filterList={cdc_filtering}
      />
    </div>
    // <div>
    //   <CascadeFilter
    //     spec={spec}
    //     setValue={(filters) => setSpec((s) => ({ ...s, filters }))}
    //   />
    //   <ApplyButton
    //     dataURL={`${BASE_API_URL}/load/mapping/zoning/standard_new`}
    //     specs={[spec]}
    //     onData={(v) => console.log(v)}
    //   />
    // </div>
  );
  // const [data, setData] = useState<any>(null);

  // return (
  //   <>
  //     <Center pt="xl" mb="md">
  //       <Title order={2}>CDC Mapping Test</Title>
  //     </Center>

  //     <FilterProvider>
  //       <FilterContainer
  //         apiURL={`${BASE_API_URL}/filters/tree?source=cdc_places`}
  //         dataURL={`${BASE_API_URL}/load/mapping/cdc/places/double`}
  //         onData={(fetchedData) => setData(fetchedData)}
  //       />
  //     </FilterProvider>

  //     <Box style={{ position: 'relative', height: 'calc(100vh - 160px)' }}>
  //       <VTMap geojson={data} showCountyLines={false} />
  //     </Box>
  //   </>
  // );
}
