'use client';
import type { FeatureCollection } from 'geojson';
import { useState } from 'react';
import { BASE_API_URL } from '@/config';
import VTMap from '@/components/mapping';
import MapPageLayout from '@/components/MapPageLayout';
import { cdc_filtering } from '@/components/FilterRedux/filterDefs';
import { FilterWrap } from '@/components/FilterRedux/filterWrap';
import { assemble } from '@/components/FilterRedux/apiHelpers';
import { postRequest } from '@/components/FilterRedux/filterRequest';
import { FilterSpec } from '@/components/FilterRedux/filterTypes';
import { Paper, Title, Box } from '@mantine/core';
import { zoning_filtering } from '@/components/FilterRedux/filterDefs';
import QuadTileMapLayout from '@/components/QuadTileMapLayout';
import { SamePerXBarChart } from '@/components/Charts';

const URL = `${BASE_API_URL}/load/mapping/zoning/standard_new`;
import { ChartItem } from '@/types/cachedCharts';

export default function Scratch_Zoning() {
  const [geojson, setGeojson] = useState<FeatureCollection | null>(null);
  const [areaChart, setAreaChart] = useState<ChartItem | null>(null);

  const handleApply = async (specs: FilterSpec[]) => {
    const payload = assemble(specs);
    const res = await postRequest({ dataURL: URL, payload });
    setGeojson(res.geojson);
    setAreaChart({
      id: 'zoning-area-chart',
      title: 'Zoning Area Chart',
      type: 'chart',
      subtype: 'bar',
      xField: 'county',
      yField: 'Acreage',
      data: res.stats,
      chartParams: {
        datakeys: [['pct', '#3b6']],
      },
      description:
        'The percentage of the TOTAL ZONED AREA that the filtered zoning data from the sidebar returns.',
    });
  };
  return (
    <QuadTileMapLayout
      title="Zoning Map Test"
      sidebar={
        <FilterWrap handleApply={handleApply} filterList={zoning_filtering} />
      }
      map={<VTMap geojson={geojson} showCountyLines={true} initialZoom={8} />}
      tiles={[areaChart && <SamePerXBarChart chart={areaChart} />]}
    ></QuadTileMapLayout>
  );
}

// export default function Scratch_Zoning() {
//   const [data, setData] = useState<FeatureCollection | null>(null);
//   const handleApply = async (specs: FilterSpec[]) => {
//     const res = await postRequest({
//       dataURL: `${BASE_API_URL}/load/mapping/zoning/standard_new`,
//       payload: assemble(specs),
//     });
//     setData(res);
//   };
//   return (
//     <MapPageLayout
//       title="Zoning Map Test"
//       sidebar={
//         <FilterWrap handleApply={handleApply} filterList={zoning_filtering} />
//       }
//       map={<VTMap geojson={data} showCountyLines={false} />}
//     />
//   );
// }

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
