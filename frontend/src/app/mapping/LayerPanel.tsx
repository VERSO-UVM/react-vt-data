'use client';

import { MAP_LAYERS } from '@/app/mapping/MapLayers';
import LayerRow from './LayerRow';
import type { LayerStats } from './UseMapLayer';
import type { ParcelColorMode } from './layerColors';
import type { FeatureCollection } from 'geojson';
import type { FilterSpec } from '@/components/FilterRedux/filterTypes';
import styles from './explorer.module.css';

interface LayerPanelProps {
  activeLayers: Set<string>;
  onToggle: (id: string, active: boolean) => void;
  onDataChange: (id: string, geojson: FeatureCollection | null) => void;
  onStatsChange: (id: string, stats: LayerStats | null) => void;
  onLoadingChange: (id: string, loading: boolean) => void;
  presetFilters?: Record<string, FilterSpec[]>;
  lockedLayerIds: Set<string>;
  combinedLayerIds: Set<string>;
  townCandidates: string[] | null;
  townBBox: [number, number, number, number] | null;
  townName: string;
  scopeVersion: number;
  parcelColorMode: ParcelColorMode;
  onParcelColorMode: (mode: ParcelColorMode) => void;
}

export default function LayerPanel({
  activeLayers,
  presetFilters,
  lockedLayerIds,
  combinedLayerIds,
  ...shared
}: LayerPanelProps) {
  return (
    <div className={styles.layers}>
      {MAP_LAYERS.map((cfg) => (
        <LayerRow
          key={cfg.id}
          config={cfg}
          active={activeLayers.has(cfg.id)}
          presetFilters={presetFilters?.[cfg.id]}
          locked={lockedLayerIds.has(cfg.id)}
          combined={combinedLayerIds.has(cfg.id)}
          {...shared}
        />
      ))}
    </div>
  );
}
