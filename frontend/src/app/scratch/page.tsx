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

export default function Scratch_CDC() {
  const [rows, setRows] = useState<FeatureCollection | null>(null);
  const comparisonURL = `${BASE_API_URL}/load/mapping/cdc/places/county_comparison`;

  const handleApply = async (specs: FilterSpec[]) => {
    const payload = assemble(specs);
    const res = await postRequest({ dataURL: comparisonURL, payload });
    setRows(res.data); // legend rides along in res.metadata.legend
  };

  return (
    <MapPageLayout
      title="Compare Variables"
      sidebar={
        <FilterWrap handleApply={handleApply} filterList={cdc_filtering} />
      }
      map={<VTMap geojson={rows} showCountyLines={false} />}
    />
  );
}
