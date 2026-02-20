'use client';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import VTMap from '@/components/mapping';
import { Box, Paper, Select, Switch, Text, Title } from '@mantine/core';
import { BASE_API_URL } from '@/config';
import FilterContainer from '@/components/FilterUI/Filter_wrap';
import axios from 'axios';
import type { FeatureCollection } from 'geojson';

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

/** Which GeoJSON property to group by, and optionally which numeric property to sum. */
const STATS_CONFIG: Record<
  string,
  { categoryKey: string; valueKey: string | null; unit: string }
> = {
  zoning: { categoryKey: 'District Type', valueKey: 'Acres', unit: 'acres' },
  'flood-legal': { categoryKey: 'FLD_ZONE', valueKey: null, unit: 'polygons' },
  'soil-suitability': {
    categoryKey: 'Suitability',
    valueKey: 'Acres',
    unit: 'acres',
  },
};

function computeStats(
  geojson: FeatureCollection | null,
  slug: string,
): [string, number][] | null {
  const cfg = STATS_CONFIG[slug];
  if (!cfg || !geojson?.features?.length) return null;
  const groups: Record<string, number> = {};
  for (const f of geojson.features) {
    const cat = String(f.properties?.[cfg.categoryKey] ?? 'Unknown');
    const val = cfg.valueKey ? Number(f.properties?.[cfg.valueKey] ?? 0) : 1;
    groups[cat] = (groups[cat] ?? 0) + val;
  }
  return Object.entries(groups).sort((a, b) => b[1] - a[1]);
}

function formatStatValue(value: number, slug: string): string {
  const cfg = STATS_CONFIG[slug];
  if (!cfg) return String(value);
  const n = value.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (cfg.valueKey === 'Acres') return `${n} ac`;
  return `${n} ${cfg.unit}`;
}

export default function MappingContent() {
  const params = useParams();
  const slug = params?.slug as string | undefined;
  const [data, setData] = useState<any>(null);
  const [rpc, setRpc] = useState<string | null>(null);
  const [showCountyLines, setShowCountyLines] = useState(true);

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

  const stats = useMemo(
    () => (slug ? computeStats(data as FeatureCollection | null, slug) : null),
    [data, slug],
  );

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
        style={{
          borderBottom: '1px solid var(--mantine-color-gray-3)',
          flexShrink: 0,
        }}
      >
        <Title order={4} mb="xs">
          {config?.title ?? slug}
        </Title>

        <Switch
          label="Show municipality boundaries"
          size="sm"
          checked={showCountyLines}
          onChange={(e) => setShowCountyLines(e.currentTarget.checked)}
          mb="sm"
        />

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

        {/* Summary statistics */}
        {stats && (
          <Box mt="sm" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {stats.map(([cat, val]) => (
              <Box
                key={cat}
                style={{
                  background: 'var(--mantine-color-gray-1)',
                  borderRadius: 6,
                  padding: '2px 10px',
                  fontSize: 12,
                  whiteSpace: 'nowrap',
                }}
              >
                <Text component="span" fw={600} size="xs">
                  {cat}
                </Text>
                <Text component="span" size="xs" c="dimmed">
                  {' '}
                  {formatStatValue(val, slug!)}
                </Text>
              </Box>
            ))}
          </Box>
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
        <VTMap geojson={data} showCountyLines={showCountyLines} />
      </Box>
    </Box>
  );
}
