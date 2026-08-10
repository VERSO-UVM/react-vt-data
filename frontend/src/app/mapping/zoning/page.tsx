'use client';
import { useEffect, useState } from 'react';
import type { FeatureCollection } from 'geojson';
import axios from 'axios';
import { Paper, Text } from '@mantine/core';
import { BASE_API_URL } from '@/config';
import VTMap from '@/components/mapping';
import QuadTileMapLayout from '@/components/QuadTileMapLayout';
import { zoning_filtering } from '@/components/FilterRedux/filterDefs';
import { FilterWrap } from '@/components/FilterRedux/filterWrap';
import { assemble } from '@/components/FilterRedux/apiHelpers';
import { postRequest } from '@/components/FilterRedux/filterRequest';
import { FilterSpec } from '@/components/FilterRedux/filterTypes';
import { SamePerXBarChart } from '@/components/Charts';
import { ChartItem } from '@/types/cachedCharts';

const ZONING_URL = `${BASE_API_URL}/load/mapping/zoning/standard_new`;
const UNZONED_URL = `${BASE_API_URL}/load/mapping/zoning/unzoned`;

/** Key for the grey backdrop layer, so users know what the grey means. */
function UnzonedLegend() {
  return (
    <Paper withBorder p="sm" radius="md" mt="md">
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <div
          style={{
            width: 16,
            height: 16,
            flexShrink: 0,
            marginTop: 2,
            borderRadius: 3,
            backgroundColor: 'rgba(170,170,170,0.63)',
            boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.15)',
          }}
        />
        <Text size="xs" c="dimmed">
          Grey areas are places we have no zoning information for. Hover for the
          town name.
        </Text>
      </div>
    </Paper>
  );
}

export default function ZoningMapPage() {
  const [geojson, setGeojson] = useState<FeatureCollection | null>(null);
  const [unzoned, setUnzoned] = useState<FeatureCollection | null>(null);
  const [areaChart, setAreaChart] = useState<ChartItem | null>(null);

  // The grey "no zoning information" backdrop is the same for every filter
  // selection, so it is fetched once on mount rather than per Apply.
  useEffect(() => {
    axios
      .get(UNZONED_URL)
      .then((res) => setUnzoned(res.data))
      .catch((e) => console.error('unzoned layer fetch failed', e));
  }, []);

  const handleApply = async (specs: FilterSpec[]) => {
    const payload = assemble(specs);
    const res = await postRequest({ dataURL: ZONING_URL, payload });
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
      title="Zoning"
      sidebar={
        <>
          <FilterWrap handleApply={handleApply} filterList={zoning_filtering} />
          <UnzonedLegend />
        </>
      }
      map={
        <VTMap
          geojson={geojson}
          baseGeojson={unzoned}
          showCountyLines={true}
          initialZoom={8}
        />
      }
      tiles={[areaChart && <SamePerXBarChart chart={areaChart} />]}
    />
  );
}
