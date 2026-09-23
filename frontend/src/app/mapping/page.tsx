'use client';

import { useState, useCallback, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import axios from 'axios';
import type { FeatureCollection } from 'geojson';
import {
  ActionIcon,
  Autocomplete,
  Badge,
  Box,
  Button,
  Collapse,
  Divider,
  Group,
  Paper,
  Progress,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  Title,
  Tooltip,
  useMantineTheme,
} from '@mantine/core';
import {
  IconChevronLeft,
  IconChevronDown,
  IconChevronUp,
  IconChartBarPopular,
  IconLayersIntersect,
  IconBuildingCommunity,
  IconDroplet,
  IconMapPin,
  IconInfoCircle,
} from '@tabler/icons-react';

import { Search } from 'lucide-react';
import { area } from '@turf/area';

import VTMap from '@/components/mapping';
import LayerPanel from './LayerPanel';
import DistributionCard from './DistributionCard';
import type { LayerStats } from './UseMapLayer';
import { MAP_LAYERS, UNZONED_URL } from '@/app/mapping/MapLayers';
import { MAP_PRESETS, type MapPreset } from '@/app/mapping/MapPresets';
import { jurisdictionCandidates } from './jurisdictionMatch';
import {
  computeBuildableOverlay,
  withParcelBuildability,
  type PolyFeature,
} from './buildableOverlay';
import type { FilterSpec } from '@/components/FilterRedux/filterTypes';
import { useMunicipalities, MunicipalityFeature } from './useMunicipalities';
import { getFeatureBBox } from './geoUtils';
import { COLORS, FONTS } from '@/app/theme';

const PRESET_ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  'buildable-areas': IconBuildingCommunity,
  infrastructure: IconDroplet,
};

// In rank order, best to worst. Mirrors the backend's filter option order
// (CUSTOM_OPTION_ORDER in query/core_functions.py) — keep the two in sync.
const SOIL_SUITABILITY_COLORS: Record<string, string> = {
  'Well Suited': '#2ca02c',
  'Moderately Suited': '#ffcc00',
  'Marginally Suited': '#fd7e14',
  'Not Suited': '#dc3545',
  'Not Rated': '#6c757d',
};

const ACRES_PER_SQM = 1 / 4046.8564224;

export default function MapExplorerPage() {
  return (
    <Suspense fallback={null}>
      <MapExplorerContent />
    </Suspense>
  );
}

function MapExplorerContent() {
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
  // Zoning's server-computed area stats — see LayerStats.
  const [zoningStats, setZoningStats] = useState<LayerStats | null>(null);
  const [presetFilters, setPresetFilters] = useState<
    Record<string, FilterSpec[]>
  >({});
  // Bumped whenever a preset is (re)selected or the selected town changes,
  // so active layers re-fetch scoped to the new preset/town.
  const [scopeVersion, setScopeVersion] = useState(0);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [showCountyLines, setShowCountyLines] = useState(true);
  const [unzoned, setUnzoned] = useState<FeatureCollection | null>(null);

  // Gate: no layer data loads until a town is selected. Statewide layers
  // (soil suitability alone is ~180k polygons) are too much to fetch and
  // render at once, so every layer fetch is scoped to this town instead.
  const [selectedTown, setSelectedTown] = useState<MunicipalityFeature | null>(
    null,
  );
  const townCandidates = useMemo(
    () =>
      selectedTown
        ? jurisdictionCandidates(selectedTown.properties.NAME)
        : null,
    [selectedTown],
  );

  useEffect(() => {
    axios
      .get(UNZONED_URL)
      .then((res) => setUnzoned(res.data))
      .catch((e) => console.error('unzoned layer fetch failed', e));
  }, []);

  // The unzoned backdrop is fetched statewide (it's small — a few hundred
  // features), but each feature's tooltip title is the exact TIGER town
  // name it belongs to, so it can be scoped to the selected town with an
  // exact match — no fuzzy jurisdiction matching needed here.
  const unzonedForTown = useMemo(() => {
    if (!selectedTown || !unzoned) return null;
    const townName = selectedTown.properties.NAME;
    return {
      ...unzoned,
      features: unzoned.features.filter(
        (f) => f.properties?.tooltip?.__title__ === townName,
      ),
    };
  }, [unzoned, selectedTown]);

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
        // Selecting a (new) town rescopes every active layer's data to it —
        // stale data from the previous town shouldn't linger on screen
        // while the rescoped fetch is in flight.
        setSelectedTown(match);
        setLayerData({});
        setZoningStats(null);
        setScopeVersion((v) => v + 1);
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
      if (id === 'zoning') setZoningStats(null);
    }
    // Manual toggling breaks out of "preset" mode so the picker no longer
    // shows a preset as selected.
    setActivePresetId(null);
  }, []);

  const handlePresetSelect = useCallback((preset: MapPreset) => {
    setActiveLayers(new Set(preset.layers));
    setPresetFilters(preset.filters ?? {});
    setScopeVersion((v) => v + 1);
    setActivePresetId(preset.id);
  }, []);

  const handlePresetClear = useCallback(() => {
    setActiveLayers(new Set());
    setLayerData({});
    setZoningStats(null);
    setPresetFilters({});
    setActivePresetId(null);
  }, []);

  // While a preset is active, its layers' filters are locked — changing
  // them would silently redefine what "Buildable Areas" means without the
  // user realizing it. Toggling a layer off (which exits preset mode via
  // handleToggle) is still allowed; only in-place filter edits are blocked.
  const lockedLayerIds = useMemo(
    () =>
      activePresetId ? new Set(Object.keys(presetFilters)) : new Set<string>(),
    [activePresetId, presetFilters],
  );

  const handleDataChange = useCallback(
    (id: string, geojson: FeatureCollection | null) => {
      setLayerData((prev) => ({ ...prev, [id]: geojson }));
    },
    [],
  );

  const handleStatsChange = useCallback(
    (id: string, stats: LayerStats | null) => {
      if (id === 'zoning') setZoningStats(stats);
    },
    [],
  );

  // Whenever both zoning and soil-suitability layers are active,
  // replace polygons with one derived "buildable" shape (permitted zoning ∩ suited
  // soil, minus flood) instead.
  const bothZoningAndSoilActive =
    activeLayers.has('zoning') && activeLayers.has('soil-suitability');

  const buildableOverlay = useMemo(() => {
    if (!bothZoningAndSoilActive) return null;
    return computeBuildableOverlay(
      layerData['zoning'],
      layerData['soil-suitability'],
      activeLayers.has('flood-legal') ? layerData['flood-legal'] : null,
      townCandidates?.[0],
    );
  }, [bothZoningAndSoilActive, layerData, activeLayers, townCandidates]);

  // Gated on both being active so the per-parcel turf.intersect pass (a few
  // thousand clips against the dissolved buildable polygon, worst case)
  // never runs for users who haven't combined Parcels with zoning+soil.
  const parcelsWithBuildability = useMemo(() => {
    if (!activeLayers.has('parcels') || !buildableOverlay) {
      return layerData['parcels'] ?? null;
    }
    return withParcelBuildability(
      layerData['parcels'] ?? null,
      buildableOverlay.geojson.features[0] as PolyFeature,
    );
  }, [activeLayers, buildableOverlay, layerData]);

  const mapLayers = MAP_LAYERS.map((cfg) => {
    const suppressed =
      bothZoningAndSoilActive &&
      (cfg.id === 'zoning' || cfg.id === 'soil-suitability');
    return {
      id: cfg.id,
      geojson: suppressed
        ? null
        : cfg.id === 'parcels'
          ? parcelsWithBuildability
          : (layerData[cfg.id] ?? null),
      visible: !suppressed && activeLayers.has(cfg.id),
    };
  });

  if (buildableOverlay) {
    mapLayers.push({
      id: 'buildable-overlay',
      geojson: buildableOverlay.geojson,
      visible: true,
    });
  }

  if (activeLayers.has('zoning') && unzonedForTown) {
    mapLayers.unshift({
      id: 'zoning-base',
      geojson: unzonedForTown,
      visible: true,
    });
  }

  const totalLoadedFeatures = Object.values(layerData).reduce(
    (acc, fc) => acc + (fc?.features?.length || 0),
    0,
  );

  const buildableAcres = useMemo(() => {
    if (buildableOverlay) return buildableOverlay.acres;

    const zoningFc = layerData['zoning'];
    if (
      bothZoningAndSoilActive ||
      !activeLayers.has('zoning') ||
      !zoningFc?.features?.length
    ) {
      return null;
    }
    return zoningFc.features.reduce((sum, f) => {
      const acres = Number(f.properties?.Acres);
      return sum + (Number.isFinite(acres) ? acres : 0);
    }, 0);
  }, [buildableOverlay, layerData, activeLayers, bothZoningAndSoilActive]);

  const soilSuitabilityDistribution = useMemo(() => {
    const fc = layerData['soil-suitability'];
    if (!activeLayers.has('soil-suitability') || !fc?.features?.length) {
      return null;
    }

    // Acreage-weighted, not feature-count-weighted: suitability polygons are
    // dissolved/merged per rating class upstream, so a handful of large
    // polygons can outweigh many small ones — counting features would
    // misrepresent how much land is actually in each class.
    const acresByClass = new Map<string, number>();
    let totalAcres = 0;
    for (const feature of fc.features) {
      const key = String(feature.properties?.Suitability ?? 'Not Rated');
      const acres = Number(feature.properties?.Acres) || 0;
      acresByClass.set(key, (acresByClass.get(key) ?? 0) + acres);
      totalAcres += acres;
    }
    if (totalAcres === 0) return null;

    return Object.keys(SOIL_SUITABILITY_COLORS)
      .filter((label) => acresByClass.has(label))
      .map((label) => {
        const acres = acresByClass.get(label) ?? 0;
        return {
          label,
          acres,
          pct: (acres / totalAcres) * 100,
          color: SOIL_SUITABILITY_COLORS[label],
        };
      });
  }, [layerData, activeLayers]);

  const treatmentFacilityCapacity = useMemo(() => {
    const fc = layerData['treatment-facilities'];
    if (!activeLayers.has('treatment-facilities') || !fc?.features?.length) {
      return null;
    }

    let totalMgd = 0;
    let reporting = 0;
    for (const feature of fc.features) {
      const raw = feature.properties?.['Design Hydraulic Capacity'];
      if (raw === null || raw === undefined || String(raw).trim() === '') {
        continue;
      }

      const mgd = Number(raw);

      if (Number.isFinite(mgd)) {
        totalMgd += mgd;
        reporting += 1;
      }
    }
    return { totalMgd, reporting, total: fc.features.length };
  }, [layerData, activeLayers]);

  // % of this town's zoned area that matches the active filters. Both sides
  // are server-side unions (see LayerStats), so overlays aren't counted
  // twice. Stats from a fetch scoped to a previous town are ignored.
  const zoningCoverage = useMemo(() => {
    if (
      !activeLayers.has('zoning') ||
      !zoningStats ||
      zoningStats.scope !== townCandidates ||
      !townCandidates
    ) {
      return null;
    }
    const candidates = new Set(townCandidates);
    let matchedAcres = 0;
    let totalAcres = 0;
    for (const t of zoningStats.towns) {
      if (!candidates.has(t.town)) continue;
      matchedAcres += t.matched_acres;
      totalAcres += t.total_acres;
    }
    if (totalAcres === 0) return null;
    return { matchedAcres, totalAcres, pct: (matchedAcres / totalAcres) * 100 };
  }, [activeLayers, zoningStats, townCandidates]);

  // Matched area per district type, as a share of the matched zoned area.
  // Overlays sit on top of base districts, so with overlays present the
  // shares can add up to more than 100%.
  const zoningDistrictComposition = useMemo(() => {
    if (!zoningCoverage || !zoningStats?.districts.length) return null;
    if (zoningCoverage.matchedAcres === 0) return null;

    const colorByDistrict = new Map<string, string>();
    for (const feature of layerData['zoning']?.features ?? []) {
      const district = String(feature.properties?.['District Type']);
      if (colorByDistrict.has(district)) continue;
      const rgba = feature.properties?.rgba_color as number[] | undefined;
      if (Array.isArray(rgba) && rgba.length >= 3) {
        colorByDistrict.set(
          district,
          `rgb(${rgba[0]}, ${rgba[1]}, ${rgba[2]})`,
        );
      }
    }

    return zoningStats.districts
      .map(({ district_type, acres }) => ({
        label: district_type ?? 'Unknown',
        acres,
        pct: (acres / zoningCoverage.matchedAcres) * 100,
        color: colorByDistrict.get(district_type) ?? '#64748b',
      }))
      .sort((a, b) => b.acres - a.acres);
  }, [zoningCoverage, zoningStats, layerData]);

  const serviceAreaSummary = useMemo(() => {
    const fc = layerData['service-areas'];
    if (!activeLayers.has('service-areas') || !fc?.features?.length) {
      return null;
    }

    let totalAcres = 0;
    const systems = new Set<string>();
    const owners = new Set<string>();
    for (const feature of fc.features) {
      try {
        totalAcres += area(feature) * ACRES_PER_SQM;
      } catch {
        // Malformed geometry shouldn't block the rest of the summary.
      }
      const systemName = feature.properties?.['System Name'];
      const systemOwner = feature.properties?.['System Owner'];
      if (systemName) systems.add(String(systemName));
      if (systemOwner) owners.add(String(systemOwner));
    }
    return { totalAcres, systemCount: systems.size, ownerCount: owners.size };
  }, [layerData, activeLayers]);

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
            <Group gap="sm" align="center">
              <Title
                order={3}
                style={{ fontFamily: theme.headings?.fontFamily, fontSize: 18 }}
              >
                Vermont Mapping
              </Title>
              <Badge
                style={{
                  color: COLORS.birch,
                  background: COLORS.amber,
                  fontFamily: FONTS.mono,
                }}
              >
                Beta
              </Badge>
              <Text size="xs" c="dimmed" fw={600}>
                {activeLayers.size} active
              </Text>
            </Group>
          </Stack>

          {!selectedTown ? (
            <Paper
              p="md"
              radius="sm"
              style={{
                backgroundColor: 'var(--mantine-color-gray-0)',
                border: '1px dashed var(--mantine-color-gray-4)',
                textAlign: 'center',
              }}
            >
              <IconMapPin
                size={22}
                color="var(--mantine-color-gray-5)"
                style={{ marginBottom: 6 }}
              />
              <Text size="sm" fw={600} c="dimmed">
                No town selected
              </Text>
              <Text size="xs" c="dimmed" mt={4}>
                Search for a town above to get started.
              </Text>
            </Paper>
          ) : (
            <>
              <Stack gap={6} mb="xs">
                <Group justify="space-between" align="center">
                  <Text size="sm" fw={700} c="dimmed" tt="uppercase">
                    Quick Start
                  </Text>
                  {activePresetId && (
                    <Button
                      variant="subtle"
                      size="compact-xs"
                      color="gray"
                      onClick={handlePresetClear}
                    >
                      Clear
                    </Button>
                  )}
                </Group>
                <SimpleGrid cols={2} spacing="xs">
                  {MAP_PRESETS.map((preset) => {
                    const Icon = PRESET_ICONS[preset.id] ?? IconLayersIntersect;
                    const isActive = activePresetId === preset.id;
                    return (
                      <Button
                        key={preset.id}
                        variant={isActive ? 'filled' : 'default'}
                        color={COLORS.spruce}
                        size="xs"
                        h="auto"
                        py={8}
                        justify="flex-start"
                        leftSection={<Icon size={16} />}
                        onClick={() => handlePresetSelect(preset)}
                        title={preset.description}
                        styles={{
                          label: { flex: 1 },
                        }}
                      >
                        <Group
                          gap={4}
                          wrap="nowrap"
                          justify="space-between"
                          w="100%"
                        >
                          <Text
                            size="xs"
                            fw={600}
                            style={{ whiteSpace: 'normal', lineHeight: 1.2 }}
                          >
                            {preset.label}
                          </Text>
                          {preset.definition && (
                            <Tooltip
                              label={preset.definition}
                              multiline
                              w={280}
                              withArrow
                              events={{ hover: true, focus: true, touch: true }}
                            >
                              <ActionIcon
                                component="span"
                                variant="transparent"
                                size="xs"
                                c={isActive ? 'white' : 'gray'}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <IconInfoCircle size={14} />
                              </ActionIcon>
                            </Tooltip>
                          )}
                        </Group>
                      </Button>
                    );
                  })}
                </SimpleGrid>
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
                    <Text size="sm" fw={600}>
                      Show Municipal Boundaries
                    </Text>
                  }
                  styles={{ track: { cursor: 'pointer' } }}
                />
              </Paper>

              <Box
                mt="xs"
                style={{ flex: 1, overflowY: 'auto', paddingRight: 4 }}
              >
                <LayerPanel
                  activeLayers={activeLayers}
                  onToggle={handleToggle}
                  onDataChange={handleDataChange}
                  onStatsChange={handleStatsChange}
                  presetFilters={presetFilters}
                  lockedLayerIds={lockedLayerIds}
                  townCandidates={townCandidates}
                  townBBox={selectedBBox}
                  scopeVersion={scopeVersion}
                />
              </Box>
            </>
          )}
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

      {selectedTown && (
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
              <SimpleGrid cols={{ base: 1, md: 4 }} spacing="md">
                <Paper
                  withBorder
                  p="xs"
                  radius="sm"
                  bg="var(--mantine-color-body)"
                >
                  <Text size="sm" c="dimmed" fw={600}>
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
                  <Text size="sm" c="dimmed" fw={600}>
                    Buildable Acreage
                  </Text>
                  {buildableAcres !== null ? (
                    <Text fw={700} size="xl" c={COLORS.spruce}>
                      {Math.round(buildableAcres).toLocaleString()} ac
                    </Text>
                  ) : (
                    <Text size="sm" c="dimmed" fs="italic" mt={6}>
                      Enable the Zoning layer to see acreage
                    </Text>
                  )}
                </Paper>

                {zoningCoverage && (
                  <Paper
                    withBorder
                    p="xs"
                    radius="sm"
                    bg="var(--mantine-color-body)"
                  >
                    <Text size="sm" c="dimmed" fw={600}>
                      Zoning Match Coverage
                    </Text>
                    <Text fw={700} size="xl" c={COLORS.spruce}>
                      {zoningCoverage.pct.toFixed(1)}%
                    </Text>
                    <Text size="xs" c="dimmed" mt={4}>
                      {Math.round(zoningCoverage.matchedAcres).toLocaleString()}{' '}
                      of{' '}
                      {Math.round(zoningCoverage.totalAcres).toLocaleString()}{' '}
                      zoned acres in{' '}
                      {selectedTown?.properties.NAME.split(',')[0] ??
                        'this town'}{' '}
                      match your filters
                    </Text>
                  </Paper>
                )}

                <Paper
                  withBorder
                  p="xs"
                  radius="sm"
                  bg="var(--mantine-color-body)"
                >
                  <Text size="sm" c="dimmed" fw={600} mb="xs">
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
                                <Text size="sm" fw={500} lineClamp={1}>
                                  {layer.title}
                                </Text>
                                <Text size="sm" c="dimmed">
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

                {soilSuitabilityDistribution && (
                  <DistributionCard
                    title="Soil Suitability Distribution"
                    rows={soilSuitabilityDistribution}
                  />
                )}

                {zoningDistrictComposition && (
                  <DistributionCard
                    title="Zoning District Composition"
                    rows={zoningDistrictComposition}
                    footnote={
                      zoningDistrictComposition.some(
                        (d) => d.label === 'Overlay',
                      ) &&
                      'Overlays sit on top of base districts, so shares can add up to more than 100%.'
                    }
                  />
                )}

                {serviceAreaSummary && (
                  <Paper
                    withBorder
                    p="xs"
                    radius="sm"
                    bg="var(--mantine-color-body)"
                  >
                    <Text size="sm" c="dimmed" fw={600}>
                      Service Area Coverage
                    </Text>
                    <Text fw={700} size="xl" c={COLORS.spruce}>
                      {Math.round(
                        serviceAreaSummary.totalAcres,
                      ).toLocaleString()}{' '}
                      ac
                    </Text>
                    <Text size="xs" c="dimmed" mt={4}>
                      {serviceAreaSummary.systemCount} system
                      {serviceAreaSummary.systemCount === 1 ? '' : 's'},{' '}
                      {serviceAreaSummary.ownerCount} owner
                      {serviceAreaSummary.ownerCount === 1 ? '' : 's'}
                    </Text>
                  </Paper>
                )}

                {treatmentFacilityCapacity && (
                  <Paper
                    withBorder
                    p="xs"
                    radius="sm"
                    bg="var(--mantine-color-body)"
                  >
                    <Text size="sm" c="dimmed" fw={600}>
                      Treatment Capacity
                    </Text>
                    <Text fw={700} size="xl" c={COLORS.spruce}>
                      {treatmentFacilityCapacity.totalMgd.toFixed(2)} MGD
                    </Text>
                    <Text size="xs" c="dimmed" mt={4}>
                      {treatmentFacilityCapacity.reporting} of{' '}
                      {treatmentFacilityCapacity.total} facilities report design
                      capacity
                    </Text>
                  </Paper>
                )}
              </SimpleGrid>
            </Box>
          </Collapse>
        </Paper>
      )}
    </Box>
  );
}
