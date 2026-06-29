'use client';
import { Box, Divider, Paper, Stack, Title } from '@mantine/core';
import { useState } from 'react';
import { BASE_API_URL } from '@/config';
import VTMap from '@/components/mapping';
import {
  cdc_filtering,
  zoning_filtering,
} from '@/components/FilterRedux/filterDefs';
import { FilterWrap } from '@/components/FilterRedux/filterWrap';

export default function Scratch_Zoning() {
  const [data, setData] = useState<{}>({});
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
          Zoning Map Test
        </Title>
        <FilterWrap
          selectData={setData}
          dataURL={`${BASE_API_URL}/load/mapping/zoning/standard_new`}
          filterList={zoning_filtering}
        />
      </Paper>
      //{' '}
      <Box
        style={{
          position: 'relative',
          flex: 1,
          minHeight: 0,
          borderRadius: 8,
          overflow: 'hidden',
        }}
      >
        <VTMap geojson={data} showCountyLines={false} />
      </Box>
    </div>
  );
}

// export default function Scratch_CDC() {
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
//           Compare Variables
//         </Title>
//         <FilterWrap
//           selectData={setData}
//           dataURL={`${BASE_API_URL}/load/mapping/cdc/places/double_new`}
//           filterList={cdc_filtering}
//         />
//       </Paper>
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
