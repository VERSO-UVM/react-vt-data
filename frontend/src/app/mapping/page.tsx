'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import axios from 'axios';
import type { FeatureCollection } from 'geojson';
import {
  Autocomplete,
  Box,
  Group,
  Paper,
  Stack,
  Switch,
  Title,
  Text,
  SimpleGrid,
  Progress,
  Divider,
  ActionIcon,
  Collapse,
  Button,
  useMantineTheme,
} from '@mantine/core';
import {
  IconChevronLeft,
  IconChevronDown,
  IconChevronUp,
  IconChartBarPopular,
  IconLayersIntersect,
} from '@tabler/icons-react';

import { Search } from 'lucide-react';

import VTMap from '@/components/mapping';
import LayerPanel from './LayerPanel';
import { MAP_LAYERS, UNZONED_URL } from '@/app/mapping/MapLayers';
import { useMunicipalities, MunicipalityFeature } from './useMunicipalities';
import { getFeatureBBox } from './geoUtils';
import { COLORS } from '@/app/theme';

export default function MapExplorerPage() {
  const theme = useMantineTheme();
  const searchParams = useSearchParams();

  // Layout & Municipality State
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [reportExpanded, setReportExpanded] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [selectedBBox, setSelectedBBox] = useState<
    [number, number, number, number] | null
  >(null);

  const { data: municipalities } = useMunicipalities();

  const [activeLayers, setActiveLayers] = useState<Set<string>>(() => {
    const initial = searchParams.get('layer');
    return initial && MAP_LAYERS.some((l) => l.id === initial)
      ? new Set([initial])
      : new Set();
  });

  const [layerData, setLayerData] = useState<
    Record<string, FeatureCollection | null>
  >({});
  const [showCountyLines, setShowCountyLines] = useState(true);
  const [unzoned, setUnzoned] = useState<FeatureCollection | null>(null);

  useEffect(() => {
    axios
      .get(UNZONED_URL)
      .then((res) => setUnzoned(res.data))
      .catch((e) => console.error('unzoned layer fetch failed', e));
  }, []);

  // 1. Build lookup dictionary & formatted options string list
  const { optionsList, municipalityMap } = useMemo(() => {
    if (!municipalities?.features) {
      return {
        optionsList: [],
        municipalityMap: new Map<string, MunicipalityFeature>(),
      };
    }

    const map = new Map<string, MunicipalityFeature>();
    const uniqueOptionsSet = new Set<string>();

    municipalities.features.forEach((f) => {
      const fullName = f.properties.NAME;
      const parts = fullName.split(',').map((s) => s.trim());

      const rawName = parts[0] || '';
      const county = parts[1] || 'VT';

      const formattedName = rawName
        .replace(/\btown\b/i, 'Town')
        .replace(/\bcity\b/i, 'City')
        .replace(/\bgore\b/i, 'Gore')
        .replace(/\bgrant\b/i, 'Grant')
        .replace(/\blocation\b/i, 'Location');

      const displayLabel = `${formattedName} (${county})`;

      map.set(displayLabel.toLowerCase(), f);
      map.set(fullName.toLowerCase(), f);
      map.set(rawName.toLowerCase(), f);
      map.set(formattedName.toLowerCase(), f);

      uniqueOptionsSet.add(displayLabel);
    });

    // Convert Set → array and sort alphabetically
    const optionsList = Array.from(uniqueOptionsSet).sort((a, b) =>
      a.localeCompare(b),
    );

    return {
      optionsList,
      municipalityMap: map,
    };
  }, [municipalities]);

  // 2. Centralized selection/bounds update handler
  const triggerBBoxUpdate = useCallback(
    (query: string) => {
      if (!query) return;

      const normalized = query.trim().toLowerCase();

      // Direct lookup or partial match fallback
      let match = municipalityMap.get(normalized);

      if (!match) {
        // Fallback search if user typed partial name (e.g., "Windsor")
        for (const [key, feature] of municipalityMap.entries()) {
          if (key.includes(normalized)) {
            match = feature;
            break;
          }
        }
      }

      if (match?.geometry) {
        const bbox = getFeatureBBox(match.geometry);
        // Ensure bbox is valid before setting
        if (bbox && (bbox[0] !== 0 || bbox[1] !== 0)) {
          setSelectedBBox(bbox);
        }
      }
    },
    [municipalityMap],
  );

  const handleSelectMunicipality = (value: string) => {
    setSearchValue(value);
    triggerBBoxUpdate(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      triggerBBoxUpdate(searchValue);
    }
  };

  const handleToggle = useCallback((id: string, active: boolean) => {
    setActiveLayers((prev) => {
      const next = new Set(prev);
      if (active) next.add(id);
      else next.delete(id);
      return next;
    });
    if (!active) {
      setLayerData((prev) => ({ ...prev, [id]: null }));
    }
  }, []);

  const handleDataChange = useCallback(
    (id: string, geojson: FeatureCollection | null) => {
      setLayerData((prev) => ({ ...prev, [id]: geojson }));
    },
    [],
  );

  const mapLayers = MAP_LAYERS.map((cfg) => ({
    id: cfg.id,
    geojson: layerData[cfg.id] ?? null,
    visible: activeLayers.has(cfg.id),
  }));

  if (activeLayers.has('zoning') && unzoned) {
    mapLayers.unshift({ id: 'zoning-base', geojson: unzoned, visible: true });
  }

  const totalLoadedFeatures = Object.values(layerData).reduce(
    (acc, fc) => acc + (fc?.features?.length || 0),
    0,
  );

  return (
    <Box
      style={{
        position: 'relative',
        width: '100vw',
        height: 'calc(100vh - 80px)',
        overflow: 'hidden',
        backgroundColor: 'var(--mantine-color-body)',
        fontFamily: theme.fontFamily,
      }}
    >
      <Box style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
        <VTMap
          layers={mapLayers}
          showCountyLines={showCountyLines}
          targetBBox={selectedBBox}
        />
      </Box>

      <Box
        style={{
          position: 'absolute',
          top: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 20,
          width: '100%',
          maxWidth: 420,
          padding: '0 16px',
        }}
      >
        <Paper
          shadow="md"
          radius="md"
          p={4}
          withBorder
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <Autocomplete
            placeholder="Search Vermont Town or City..."
            leftSection={<Search size={16} color={COLORS.spruce} />}
            data={optionsList}
            value={searchValue}
            onChange={setSearchValue}
            onOptionSubmit={handleSelectMunicipality}
            onKeyDown={handleKeyDown}
            variant="unstyled"
            styles={{
              input: {
                fontSize: '14px',
                fontWeight: 500,
                paddingLeft: '36px',
              },
            }}
          />
        </Paper>
      </Box>

      <Box
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          zIndex: 10,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 0,
        }}
      >
        <Paper
          shadow="md"
          radius="md"
          p="md"
          withBorder
          style={{
            width: sidebarOpen ? 340 : 0,
            opacity: sidebarOpen ? 1 : 0,
            overflow: 'hidden',
            pointerEvents: sidebarOpen ? 'all' : 'none',
            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            maxHeight: 'calc(100vh - 160px)',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <Stack gap="xs" mb="xs">
            <Group justify="space-between" align="center">
              <Title
                order={3}
                style={{ fontFamily: theme.headings?.fontFamily, fontSize: 18 }}
              >
                Vermont Mapping
              </Title>
              <Text size="xs" c="dimmed" fw={600}>
                {activeLayers.size} active
              </Text>
            </Group>
            <Text size="xs" c="dimmed">
              Select datasets to overlay boundaries, environmental factors, and
              zoning parameters.
            </Text>
          </Stack>

          <Divider my="xs" />

          <Paper
            p="xs"
            radius="sm"
            style={{
              backgroundColor: 'var(--mantine-color-gray-0)',
              border: '1px solid var(--mantine-color-gray-3)',
            }}
          >
            <Switch
              checked={showCountyLines}
              onChange={(event) =>
                setShowCountyLines(event.currentTarget.checked)
              }
              color={COLORS.spruce}
              label={
                <Text size="xs" fw={600}>
                  Show Municipal Boundaries
                </Text>
              }
              styles={{ track: { cursor: 'pointer' } }}
            />
          </Paper>

          <Box mt="xs" style={{ flex: 1, overflowY: 'auto', paddingRight: 4 }}>
            <LayerPanel
              activeLayers={activeLayers}
              onToggle={handleToggle}
              onDataChange={handleDataChange}
            />
          </Box>
        </Paper>

        <Paper
          shadow="md"
          radius="md"
          style={{
            borderTopLeftRadius: sidebarOpen ? 0 : undefined,
            borderBottomLeftRadius: sidebarOpen ? 0 : undefined,
            marginLeft: sidebarOpen ? -1 : 0,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <ActionIcon
            variant="subtle"
            color="gray"
            size="xl"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle Sidebar"
            px={sidebarOpen ? 'xs' : 'md'}
            style={{
              minWidth: sidebarOpen ? 40 : 110,
              transition: 'all 0.2s ease',
            }}
          >
            {sidebarOpen ? (
              <IconChevronLeft size={18} />
            ) : (
              <Group gap={6} align="center" wrap="nowrap">
                <Text size="sm" fw={600}>
                  Layers
                </Text>
                <IconLayersIntersect size={26} stroke={1.5} />
              </Group>
            )}
          </ActionIcon>
        </Paper>
      </Box>

      <Paper
        shadow="lg"
        withBorder
        style={{
          position: 'absolute',
          bottom: 0,
          left: sidebarOpen ? 370 : 16,
          right: 16,
          zIndex: 10,
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
          transition: 'left 0.3s ease',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <Group
          justify="space-between"
          px="md"
          py="xs"
          onClick={() => setReportExpanded(!reportExpanded)}
          style={{ cursor: 'pointer', userSelect: 'none' }}
        >
          <Group gap="xs">
            <IconChartBarPopular size={16} color={COLORS.spruce} />
            <Text
              size="xs"
              fw={700}
              style={{ fontFamily: theme.headings?.fontFamily }}
            >
              SPATIAL ANALYSIS & REPORT SUMMARY
            </Text>
            <Text size="xs" c="dimmed" ml="sm">
              • {totalLoadedFeatures.toLocaleString()} records active
            </Text>
          </Group>

          <Button
            variant="subtle"
            size="compact-xs"
            color="gray"
            rightSection={
              reportExpanded ? (
                <IconChevronDown size={14} />
              ) : (
                <IconChevronUp size={14} />
              )
            }
          >
            {reportExpanded ? 'Collapse Report' : 'Expand Insights'}
          </Button>
        </Group>

        <Collapse expanded={reportExpanded}>
          <Box p="md" style={{ maxHeight: '35vh', overflowY: 'auto' }}>
            <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
              <Paper
                withBorder
                p="xs"
                radius="sm"
                bg="var(--mantine-color-body)"
              >
                <Text size="xs" c="dimmed" fw={600}>
                  Total Rendered Features
                </Text>
                <Text fw={700} size="xl" c={COLORS.spruce}>
                  {totalLoadedFeatures.toLocaleString()}
                </Text>
              </Paper>

              <Paper
                withBorder
                p="xs"
                radius="sm"
                bg="var(--mantine-color-body)"
              >
                <Text size="xs" c="dimmed" fw={600} mb="xs">
                  Layer Density Distribution
                </Text>
                {activeLayers.size === 0 ? (
                  <Text size="xs" c="dimmed" fs="italic">
                    No active layer data
                  </Text>
                ) : (
                  <Stack gap={6}>
                    {MAP_LAYERS.filter((l) => activeLayers.has(l.id)).map(
                      (layer) => {
                        const count =
                          layerData[layer.id]?.features?.length || 0;
                        return (
                          <Box key={layer.id}>
                            <Group justify="space-between" mb={2}>
                              <Text size="xs" fw={500} lineClamp={1}>
                                {layer.title}
                              </Text>
                              <Text size="xs" c="dimmed">
                                {count}
                              </Text>
                            </Group>
                            <Progress
                              value={
                                totalLoadedFeatures > 0
                                  ? (count / totalLoadedFeatures) * 100
                                  : 0
                              }
                              color={layer.color}
                              size="xs"
                              radius="xl"
                            />
                          </Box>
                        );
                      },
                    )}
                  </Stack>
                )}
              </Paper>

              <Paper
                withBorder
                p="xs"
                radius="sm"
                bg="var(--mantine-color-body)"
              >
                <Text size="xs" c="dimmed" fw={600} mb={4}>
                  Regional Findings
                </Text>
                <Box
                  mt="xs"
                  h={70}
                  style={{
                    border: '1px dashed var(--mantine-color-default-border)',
                    borderRadius: theme.radius.sm,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text size="xs" c="dimmed">
                    Chart Canvas / Spatial Distribution Plot
                  </Text>
                </Box>
              </Paper>
            </SimpleGrid>
          </Box>
        </Collapse>
      </Paper>
    </Box>
  );
}
