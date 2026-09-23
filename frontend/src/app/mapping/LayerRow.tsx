'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Switch,
  Group,
  Text,
  Box,
  LoadingOverlay,
  SegmentedControl,
} from '@mantine/core';
import { FilterWrap } from '@/components/FilterRedux/filterWrap';
import { useMapLayer, type LayerStats } from './UseMapLayer';
import { recolorParcels, type ParcelColorMode } from './layerColors';
import type { MapLayerConfig } from '@/app/mapping/MapLayers';
import type { FilterSpec } from '@/components/FilterRedux/filterTypes';
import type { FeatureCollection } from 'geojson';

interface LayerRowProps {
  config: MapLayerConfig;
  active: boolean;
  onToggle: (id: string, active: boolean) => void;
  onDataChange: (id: string, geojson: FeatureCollection | null) => void;
  /** This layer's server-computed area stats (zoning only), or null when
   *  the layer is off — feeds the report's coverage/composition cards. */
  onStatsChange: (id: string, stats: LayerStats | null) => void;
  /** Initial filters to apply for this layer, e.g. from a use-case preset. */
  presetFilters?: FilterSpec[];
  /** Candidate spellings of the selected town's name, merged into every
   *  fetch this layer makes so requests stay scoped to that town. */
  townCandidates: string[] | null;
  /** The selected town's bounding box; every fetch is cropped to it
   *  client-side regardless of server-side jurisdiction scoping. */
  townBBox: [number, number, number, number] | null;
  /** True while a preset that defines this layer's filters is active —
   *  disables the filter UI so editing it can't silently redefine what the
   *  preset means (e.g. "Buildable Areas"). Toggling the layer off still
   *  works and exits preset mode. */
  locked: boolean;
  /** Bumped whenever a preset is (re)selected or the town changes, so the
   *  active filters get re-applied against the new scope. */
  scopeVersion: number;
}

export default function LayerRow({
  config,
  active,
  onToggle,
  onDataChange,
  onStatsChange,
  presetFilters,
  townCandidates,
  townBBox,
  locked,
  scopeVersion,
}: LayerRowProps) {
  const { geojson, stats, loading, applyFilters } = useMapLayer(
    config,
    townCandidates,
    townBBox,
  );

  // Parcels can be recolored by attribute (Category or Assessed Value)
  // without a re-fetch — purely a client-side restyle of the geojson already
  // on hand. Irrelevant for every other layer, which keeps its server/
  // recolorLayer color untouched.
  const [parcelColorMode, setParcelColorMode] =
    useState<ParcelColorMode>('category');
  const displayGeojson = useMemo(() => {
    if (config.id !== 'parcels' || !geojson) return geojson;
    return recolorParcels(geojson, parcelColorMode);
  }, [config.id, geojson, parcelColorMode]);

  // Push this layer's geojson up to the map whenever it changes, and clear
  // it from the map immediately when the layer is switched off (data stays
  // cached in the hook so re-enabling doesn't require a re-fetch).
  useEffect(() => {
    onDataChange(config.id, active ? displayGeojson : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayGeojson, active]);

  useEffect(() => {
    onStatsChange(config.id, active ? stats : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats, active]);

  // (Re)fetch at most once per scopeVersion while active: once on first
  // activation, and again whenever a preset is (re)selected or the town
  // changes (both bump scopeVersion). Re-toggling the layer off/on in
  // between doesn't re-fetch, so it never clobbers the user's own filter
  // tweaks made via the Apply button below.
  const initialSpecs = presetFilters ?? config.defaultFilters;
  const appliedVersion = useRef<number | null>(null);
  useEffect(() => {
    if (!active) return;
    if (appliedVersion.current === scopeVersion) return;
    appliedVersion.current = scopeVersion;
    applyFilters(initialSpecs ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, scopeVersion]);

  return (
    <Box style={{ position: 'relative' }}>
      <LoadingOverlay visible={active && loading} zIndex={5} />

      <Group justify="space-between" wrap="nowrap">
        <Group gap="xs" wrap="nowrap">
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: 3,
              flexShrink: 0,
              backgroundColor: config.color,
              display: 'inline-block',
            }}
          />
          <Text fw={500} size="md">
            {config.title}
          </Text>
        </Group>
        <Switch
          checked={active}
          onChange={(event) => onToggle(config.id, event.currentTarget.checked)}
          color={config.color}
        />
      </Group>

      {active && config.id === 'parcels' && (
        <Box mt="sm">
          <Text size="xs" c="dimmed" mb={4}>
            Color by
          </Text>
          <SegmentedControl
            fullWidth
            size="xs"
            value={parcelColorMode}
            onChange={(v) => setParcelColorMode(v as ParcelColorMode)}
            data={[
              { label: 'Category', value: 'category' },
              { label: 'Assessed Value', value: 'value' },
            ]}
          />
        </Box>
      )}

      {active && config.filterList.length > 0 && (
        <Box mt="sm">
          {locked && (
            <Text size="xs" c="dimmed" fs="italic" mb={6}>
              {config.filterList.some((d) => d.filter_style === 'Range')
                ? 'Categorical filters locked by preset — sliders remain adjustable'
                : 'Locked by preset — turn the layer off to edit'}
            </Text>
          )}
          <FilterWrap
            key={scopeVersion}
            filterList={config.filterList}
            handleApply={applyFilters}
            initialSpecs={initialSpecs}
            locked={locked}
          />
        </Box>
      )}
    </Box>
  );
}
