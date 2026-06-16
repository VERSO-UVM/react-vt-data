'use client';

import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import VTMap from '@/components/mapping';
import {
  Accordion,
  Box,
  Card,
  Group,
  LoadingOverlay,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  Title,
} from '@mantine/core';
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
    initialURL: `${BASE_API_URL}/load/mapping/zoning/standard`,
    filterURL: `${BASE_API_URL}/filters/tree?source=zoning_info`,
    dataURL: `${BASE_API_URL}/load/mapping/zoning/standard`,
  },
  'flood-legal': {
    title: 'Flood Insurance',
    initialURL: `${BASE_API_URL}/load/mapping/flood_legal`,
  },
  'soil-suitability': {
    title: 'Soil Suitability',
  },
};

const STATS_CONFIG: Record<
  string,
  { categoryKey: string; valueKey: string | null; unit: string }
> = {
  zoning: {
    categoryKey: 'District Type',
    valueKey: 'Acres',
    unit: 'acres',
  },
  'flood-legal': {
    categoryKey: 'FLD_ZONE',
    valueKey: null,
    unit: 'polygons',
  },
  'soil-suitability': {
    categoryKey: 'Suitability',
    valueKey: 'Acres',
    unit: 'acres',
  },
};

const ZONING_COLORS: Record<string, string> = {
  Residential: '#1f77b4',
  Mixed: '#ff7f0e',
  Nonresidential: '#2ca02c',
  Overlay: '#d62728',
};

function computeStats(
  geojson: FeatureCollection | null,
  slug: string,
): [string, number, number][] | null {
  const cfg = STATS_CONFIG[slug];
  if (!cfg || !geojson?.features?.length) return null;

  const groups: Record<string, number> = {};
  let total = 0;

  for (const f of geojson.features) {
    const cat = String(f.properties?.[cfg.categoryKey] ?? 'Unknown');
    const val = cfg.valueKey
      ? Number(f.properties?.[cfg.valueKey] ?? 0)
      : 1;

    groups[cat] = (groups[cat] ?? 0) + val;
    total += val;
  }

  return Object.entries(groups)
    .map(([cat, val]) => [cat, val, total] as [string, number, number])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
}

function formatStatValue(value: number, slug: string): string {
  const cfg = STATS_CONFIG[slug];

  if (!cfg) {
    return value.toLocaleString();
  }

  const formatted = value.toLocaleString('en-US', {
    maximumFractionDigits: 0,
  });

  if (cfg.valueKey === 'Acres') {
    return `${formatted} acres`;
  }

  return `${formatted}`;
}

function formatPercent(value: number, total: number): string {
  return `(${((value / total) * 100).toFixed(1)}%)`;
}

export default function MappingContent() {
  const params = useParams();
  const slug = params?.slug as string | undefined;

  const [data, setData] = useState<any>(null);
  const [rpc, setRpc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCountyLines, setShowCountyLines] = useState(true);

  const config = slug ? MAP_CONFIG[slug] : undefined;

  useEffect(() => {
    setData(null);
    setRpc(null);
  }, [slug]);

  useEffect(() => {
    if (!slug || !config?.initialURL) return;

    setLoading(true);

    axios
      .get(config.initialURL)
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [slug, config?.initialURL]);

  useEffect(() => {
    if (!rpc) return;

    setLoading(true);
    setData(null);

    axios
      .get(`${BASE_API_URL}/load/mapping/wastewater/soil_septic/${rpc}`)
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [rpc]);

  const stats = useMemo(
    () => (slug ? computeStats(data as FeatureCollection | null, slug) : null),
    [data, slug],
  );

  const totalFeatures = data?.features?.length ?? 0;

  return (
    <Box
      h="calc(100vh - 80px)"
      style={{
        overflow: 'hidden',
      }}
    >
      <Group
        h="100%"
        align="stretch"
        gap="md"
        wrap="nowrap"
      >
        {/* Sidebar */}

        <Paper
  w={360}
  p="md"
  withBorder
  shadow="xs"
  style={{
    overflowY: 'auto',
    flexShrink: 0,
  }}
>
  <Stack gap="md">
    <Box>
      <Title order={2}>
        {config?.title ?? slug}
      </Title>

      <Text
        size="sm"
        c="dimmed"
        mt={4}
      >
        Explore Vermont spatial datasets and planning information.
      </Text>

      {totalFeatures > 0 && (
        <Text
          size="sm"
          mt="xs"
          fw={500}
        >
          {totalFeatures.toLocaleString()} features loaded
        </Text>
      )}
    </Box>

    {/* Controls */}

    <Paper
      withBorder
      p="sm"
      radius="md"
      bg="gray.0"
    >
      <Stack gap="sm">
        <Switch
          checked={showCountyLines}
          onChange={(event) =>
            setShowCountyLines(event.currentTarget.checked)
          }
          label="Show municipality boundaries"
        />

        {slug === 'soil-suitability' && (
          <Select
            label="Regional Planning Commission"
            placeholder="Select RPC"
            data={SOIL_RPCS}
            value={rpc}
            onChange={setRpc}
            searchable
          />
        )}
      </Stack>
        </Paper>

        {/* Filters */}

        {config?.filterURL && config?.dataURL && (
          <Accordion
            variant="separated"
            defaultValue="filters"
          >
            <Accordion.Item value="filters">
              <Accordion.Control>
                Filters
              </Accordion.Control>

              <Accordion.Panel>
                <Box
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    width: '100%',
                  }}
                >
                  <FilterContainer
                    apiURL={config.filterURL}
                    dataURL={config.dataURL}
                    onData={(fetchedData) =>
                      setData(fetchedData)
                    }
                  />
                </Box>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        )}

        {/* Summary */}

        {stats && stats.length > 0 && (
          <Box>
            <Group
              justify="space-between"
              mb="sm"
            >
              <Title order={5}>
                {config?.title} Summary
              </Title>

              <Text
                size="xs"
                c="dimmed"
              >
              </Text>
            </Group>

            <Stack gap="xs">
              {stats.map(([category, value, total]) => (
                <Card
                  key={category}
                  withBorder
                  radius="md"
                  p="sm"
                  style={{
                    borderLeft:
                      slug === 'zoning'
                        ? `6px solid ${
                            ZONING_COLORS[category] ??
                            '#ced4da'
                          }`
                        : undefined,
                  }}
                >
                  <Group justify="space-between">
                    <Box style={{ flex: 1 }}>
                      <Group
                        gap="xs"
                        wrap="nowrap"
                      >
                        {slug === 'zoning' && (
                          <Box
                            style={{
                              width: 12,
                              height: 12,
                              borderRadius: 999,
                              flexShrink: 0,
                              background:
                                ZONING_COLORS[
                                  category
                                ] ?? '#adb5bd',
                            }}
                          />
                        )}

                        <Text
                          size="sm"
                          fw={500}
                        >
                          {category}
                        </Text>
                      </Group>
                    </Box>

                    <Text fw={700} size="sm">
                      {formatStatValue(value, slug!)}
                    </Text>

                    <Text size="xs" c="dimmed">
                      {formatPercent(value, total)}
                    </Text>
                  </Group>
                </Card>
              ))}
            </Stack>
          </Box>
        )}
      </Stack>
    </Paper>

        {/* Map */}

        <Box
          style={{
            flex: 1,
            position: 'relative',
            overflow: 'hidden',
            borderRadius: 8,
          }}
        >
          <LoadingOverlay
            visible={loading}
            zIndex={1000}
          />

          <VTMap
            geojson={data}
            showCountyLines={showCountyLines}
          />
        </Box>
      </Group>
    </Box>
  );
}