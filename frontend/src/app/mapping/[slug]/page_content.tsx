'use client';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import VTMap from '@/components/mapping';
import { Box, Paper, Select, Title } from '@mantine/core';
import { BASE_API_URL } from '@/config';
import FilterContainer from '@/components/FilterUI/Filter_wrap';
import axios from 'axios';

const SOIL_RPCS = [
  { value: 'ACRPC', label: 'Addison County (ACRPC)' },
  { value: 'BCRC', label: 'Bennington County (BCRC)' },
  { value: 'CCRPC', label: 'Chittenden County (CCRPC)' },
  { value: 'CVRPC', label: 'Central Vermont (CVRPC)' },
  { value: 'LCPC', label: 'Lamoille County (LCPC)' },
  { value: 'MARC', label: 'Mount Ascutney (MARC)' },
  { value: 'NWRPC', label: 'Northwest (NWRPC)' },
];

const MAP_CONFIG: Record<
  string,
  { title: string; initialURL?: string; filterURL?: string; dataURL?: string }
> = {
  zoning: {
    title: 'Zoning',
    initialURL: `${BASE_API_URL}/load/mapping/zoning`,
    filterURL: `${BASE_API_URL}/load/mapping/zoning/filters`,
    dataURL: `${BASE_API_URL}/load/mapping/zoning`,
  },
  'flood-legal': {
    title: 'Flood Insurance',
    initialURL: `${BASE_API_URL}/load/mapping/flood_legal`,
  },
  'soil-suitability': {
    title: 'Soil Suitability',
    // initialURL requires RPC — handled separately below
  },
};

export default function MappingContent() {
  const params = useParams();
  const slug = params?.slug as string | undefined;
  const [data, setData] = useState<any>(null);
  const [rpc, setRpc] = useState<string | null>(null);

  const config = slug ? MAP_CONFIG[slug] : undefined;

  // Clear state on slug change
  useEffect(() => {
    setData(null);
    setRpc(null);
  }, [slug]);

  // Initial load via GET for slugs that have a direct URL
  useEffect(() => {
    if (!slug || !config?.initialURL) return;
    axios
      .get(config.initialURL)
      .then((res) => setData(res.data))
      .catch(console.error);
  }, [slug, config?.initialURL]);

  // Soil-suitability: load when RPC is selected
  useEffect(() => {
    if (!rpc) return;
    setData(null);
    axios
      .get(`${BASE_API_URL}/load/mapping/wastewater/soil_septic/${rpc}`)
      .then((res) => setData(res.data))
      .catch(console.error);
  }, [rpc]);

  return (
    <Box
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 180px)',
        overflow: 'hidden',
      }}
    >
      {/* Filter / control panel */}
      <Paper
        p="md"
        radius="sm"
        shadow="xs"
        mb="sm"
        style={{ borderBottom: '1px solid var(--mantine-color-gray-3)', flexShrink: 0 }}
      >
        <Title order={4} mb="xs">
          {config?.title ?? slug}
        </Title>

        {slug === 'soil-suitability' && (
          <Select
            label="Regional Planning Commission"
            placeholder="Select RPC to load data"
            data={SOIL_RPCS}
            value={rpc}
            onChange={setRpc}
          />
        )}

        {config?.filterURL && config?.dataURL && (
          <FilterContainer
            apiURL={config.filterURL}
            dataURL={config.dataURL}
            onData={(fetchedData) => setData(fetchedData)}
          />
        )}
      </Paper>

      {/* Map panel — fills all remaining height */}
      <Box
        style={{
          flex: 1,
          position: 'relative',
          minHeight: 0,
          overflow: 'hidden',
          borderRadius: 'var(--mantine-radius-sm)',
        }}
      >
        <VTMap geojson={data} />
      </Box>
    </Box>
  );
}
