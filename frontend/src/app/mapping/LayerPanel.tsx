'use client';

import { Stack, Divider } from '@mantine/core';
import { MAP_LAYERS } from '@/app/mapping/MapLayers';
import LayerRow from './LayerRow';
import type { FeatureCollection } from 'geojson';

interface LayerPanelProps {
  activeLayers: Set<string>;
  onToggle: (id: string, active: boolean) => void;
  onDataChange: (id: string, geojson: FeatureCollection | null) => void;
}

export default function LayerPanel({
  activeLayers,
  onToggle,
  onDataChange,
}: LayerPanelProps) {
  return (
    <Stack gap="md">
      {MAP_LAYERS.map((cfg, i) => (
        <div key={cfg.id}>
          {i > 0 && <Divider mb="md" />}
          <LayerRow
            config={cfg}
            active={activeLayers.has(cfg.id)}
            onToggle={onToggle}
            onDataChange={onDataChange}
          />
        </div>
      ))}
    </Stack>
  );
}
