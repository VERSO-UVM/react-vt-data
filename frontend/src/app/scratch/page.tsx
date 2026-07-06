'use client';
import { Box, Divider, Paper, Stack, Title } from '@mantine/core';
import type { FeatureCollection } from 'geojson';
import { useState } from 'react';
import { BASE_API_URL } from '@/config';
import VTMap from '@/components/mapping';
import {
  cdc_filtering,
  zoning_filtering,
} from '@/components/FilterRedux/filterDefs';
import { FilterWrap } from '@/components/FilterRedux/filterWrap';
import { Spectral_SC } from 'next/font/google';
import { assemble } from '@/components/FilterRedux/apiHelpers';
import { postRequest } from '@/components/FilterRedux/filterRequest';
import { FilterSpec } from '@/components/FilterRedux/filterTypes';

// export default function Scratch_Zoning() {
//   const [data, setData] = useState<{}>({});
//   return (
//     <div
//       style={{
//         display: 'flex',
//         gap: 16,
//         padding: 16,
//         height: 'calc(100vh - 80px)',
//       }}
//     >
//       <Paper
//         withBorder
//         p="md"
//         radius="md"
//         style={{ width: 340, flexShrink: 0, overflowY: 'auto' }}
//       >
//         <Title order={4} mb="sm">
//           Zoning Map Test
//         </Title>
//         <FilterWrap
//           selectData={setData}
//           dataURL={`${BASE_API_URL}/load/mapping/zoning/standard_new`}
//           filterList={zoning_filtering}
//         />
//       </Paper>
//       //{' '}
//       <Box
//         style={{
//           position: 'relative',
//           flex: 1,
//           minHeight: 0,
//           borderRadius: 8,
//           overflow: 'hidden',
//         }}
//       >
//         <VTMap geojson={data} showCountyLines={false} />
//       </Box>
//     </div>
//   );
// }

export default function Scratch_CDC() {
  const [rows, setRows] = useState<FeatureCollection | null>(null);
  const comparisonURL = `${BASE_API_URL}/load/mapping/cdc/places/comparison`;

  const handleApply = async (specs: FilterSpec[]) => {
    const payload = assemble(specs);
    const res = await postRequest({ dataURL: comparisonURL, payload });
    setRows(res.data); // legend rides along in res.metadata.legend
  };

  return (
    <div
      style={{
        display: 'flex',
        gap: 16,
        padding: 16,
        height: 'calc(100vh - 80px)',
      }}
    >
      <Paper
        withBorder
        p="md"
        radius="md"
        style={{ width: 340, flexShrink: 0, overflowY: 'auto' }}
      >
        <Title order={4} mb="sm">
          Compare Variables
        </Title>
        <FilterWrap handleApply={handleApply} filterList={cdc_filtering} />
      </Paper>
      <Box
        style={{
          position: 'relative',
          flex: 1,
          minHeight: 0,
          borderRadius: 8,
          overflow: 'hidden',
        }}
      >
        <VTMap geojson={rows} showCountyLines={false} />
      </Box>
    </div>
  );
}
