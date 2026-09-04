'use client';

import { useEffect, useRef } from 'react';
import { Switch, Group, Text, Box, LoadingOverlay } from '@mantine/core';
import { FilterWrap } from '@/components/FilterRedux/filterWrap';
import MapLegend from '@/components/Legend';
import { useMapLayer } from './UseMapLayer';
import type { MapLayerConfig } from '@/app/mapping/MapLayers';
import type { FilterSpec } from '@/components/FilterRedux/filterTypes';
import type { FeatureCollection } from 'geojson';

interface LayerRowProps {
  config: MapLayerConfig;
  active: boolean;
  onToggle: (id: string, active: boolean) => void;
  onDataChange: (id: string, geojson: FeatureCollection | null) => void;
  /** Initial filters to apply for this layer, e.g. from a use-case preset. */
  presetFilters?: FilterSpec[];
  /** Candidate spellings of the selected town's name, merged into every
   *  fetch this layer makes so requests stay scoped to that town. */
  townCandidates: string[] | null;
  /** The selected town's bounding box; every fetch is cropped to it
   *  client-side regardless of server-side jurisdiction scoping. */
  townBBox: [number, number, number, number] | null;
  /** Bumped whenever a preset is (re)selected or the town changes, so the
   *  active filters get re-applied against the new scope. */
  scopeVersion: number;
}

export default function LayerRow({
  config,
  active,
  onToggle,
  onDataChange,
  presetFilters,
  townCandidates,
  townBBox,
  scopeVersion,
}: LayerRowProps) {
  const { geojson, legend, loading, applyFilters, fetchLegend } = useMapLayer(
    config,
    townCandidates,
    townBBox,
  );

  // Push this layer's geojson up to the map whenever it changes, and clear
  // it from the map immediately when the layer is switched off (data stays
  // cached in the hook so re-enabling doesn't require a re-fetch).
  useEffect(() => {
    onDataChange(config.id, active ? geojson : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geojson, active]);

  // (Re)fetch at most once per scopeVersion while active: once on first
  // activation, and again whenever a preset is (re)selected or the town
  // changes (both bump scopeVersion). Re-toggling the layer off/on in
  // between doesn't re-fetch, so it never clobbers the user's own filter
  // tweaks made via the Apply button below.
  const appliedVersion = useRef<number | null>(null);
  useEffect(() => {
    if (!active) return;
    if (appliedVersion.current === scopeVersion) return;
    appliedVersion.current = scopeVersion;
    applyFilters(presetFilters ?? []);
    fetchLegend();
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
          <Text fw={500} size="sm">
            {config.title}
          </Text>
        </Group>
        <Switch
          checked={active}
          onChange={(event) => onToggle(config.id, event.currentTarget.checked)}
          color={config.color}
        />
      </Group>

      {active && config.filterList.length > 0 && (
        <Box mt="sm">
          <FilterWrap
            key={scopeVersion}
            filterList={config.filterList}
            handleApply={applyFilters}
            initialSpecs={presetFilters}
          />
        </Box>
      )}

      {active && config.legendURL && legend.length > 0 && (
        <MapLegend data={legend} />
      )}
    </Box>
  );
}
