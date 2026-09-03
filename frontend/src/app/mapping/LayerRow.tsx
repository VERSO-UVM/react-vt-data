'use client';

import { useEffect } from 'react';
import { Switch, Group, Text, Box, LoadingOverlay } from '@mantine/core';
import { FilterWrap } from '@/components/FilterRedux/filterWrap';
import MapLegend from '@/components/Legend';
import { useMapLayer } from './UseMapLayer';
import type { MapLayerConfig } from '@/app/mapping/MapLayers';
import type { FeatureCollection } from 'geojson';

interface LayerRowProps {
  config: MapLayerConfig;
  active: boolean;
  onToggle: (id: string, active: boolean) => void;
  onDataChange: (id: string, geojson: FeatureCollection | null) => void;
}

export default function LayerRow({
  config,
  active,
  onToggle,
  onDataChange,
}: LayerRowProps) {
  const { geojson, legend, loading, applyFilters, loadInitial } =
    useMapLayer(config);

  // Push this layer's geojson up to the map whenever it changes, and clear
  // it from the map immediately when the layer is switched off (data stays
  // cached in the hook so re-enabling doesn't require a re-fetch).
  useEffect(() => {
    onDataChange(config.id, active ? geojson : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geojson, active]);

  useEffect(() => {
    if (active) loadInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

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
            filterList={config.filterList}
            handleApply={applyFilters}
          />
        </Box>
      )}

      {active && config.legendURL && legend.length > 0 && (
        <MapLegend data={legend} />
      )}
    </Box>
  );
}
