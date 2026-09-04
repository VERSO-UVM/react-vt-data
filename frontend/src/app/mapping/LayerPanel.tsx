'use client';

import { Stack, Divider } from '@mantine/core';
import { MAP_LAYERS } from '@/app/mapping/MapLayers';
import LayerRow from './LayerRow';
import type { FeatureCollection } from 'geojson';
import type { FilterSpec } from '@/components/FilterRedux/filterTypes';

interface LayerPanelProps {
  activeLayers: Set<string>;
  onToggle: (id: string, active: boolean) => void;
  onDataChange: (id: string, geojson: FeatureCollection | null) => void;
  presetFilters?: Record<string, FilterSpec[]>;
  townCandidates: string[] | null;
  townBBox: [number, number, number, number] | null;
  scopeVersion: number;
}

export default function LayerPanel({
  activeLayers,
  onToggle,
  onDataChange,
  presetFilters,
  townCandidates,
  townBBox,
  scopeVersion,
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
            presetFilters={presetFilters?.[cfg.id]}
            townCandidates={townCandidates}
            townBBox={townBBox}
            scopeVersion={scopeVersion}
          />
        </div>
      ))}
    </Stack>
  );
}
