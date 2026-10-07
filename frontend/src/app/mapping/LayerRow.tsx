'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Loader, SegmentedControl, Switch } from '@mantine/core';
import {
  IconAdjustmentsHorizontal,
  IconChevronDown,
  IconLock,
} from '@tabler/icons-react';
import { FilterWrap } from '@/components/FilterRedux/filterWrap';
import { useMapLayer, type LayerStats } from './UseMapLayer';
import { recolorParcels, type ParcelColorMode } from './layerColors';
import type { MapLayerConfig } from '@/app/mapping/MapLayers';
import type { FilterSpec } from '@/components/FilterRedux/filterTypes';
import type { FeatureCollection } from 'geojson';
import styles from './explorer.module.css';

interface LayerRowProps {
  config: MapLayerConfig;
  active: boolean;
  onToggle: (id: string, active: boolean) => void;
  onDataChange: (id: string, geojson: FeatureCollection | null) => void;
  /** This layer's server-computed area stats (zoning only), or null when
   *  the layer is off — feeds the zoning figures over the map. */
  onStatsChange: (id: string, stats: LayerStats | null) => void;
  /** Whether this layer is fetching right now, so the page can say so. */
  onLoadingChange: (id: string, loading: boolean) => void;
  /** Initial filters to apply for this layer, e.g. from a use-case preset. */
  presetFilters?: FilterSpec[];
  /** Candidate spellings of the selected town's name, merged into every
   *  fetch this layer makes so requests stay scoped to that town. */
  townCandidates: string[] | null;
  /** The selected town's bounding box; every fetch is cropped to it
   *  client-side regardless of server-side jurisdiction scoping. */
  townBBox: [number, number, number, number] | null;
  /** The selected town's name, for messages. */
  townName: string;
  /** True while a preset that defines this layer's filters is active —
   *  disables the filter UI so editing it can't silently redefine what the
   *  preset means (e.g. "Buildable Areas"). Toggling the layer off still
   *  works and exits preset mode. */
  locked: boolean;
  /** True while the map draws this layer's overlap with another (zoning
   *  and soil, when both are on) instead of its own polygons. */
  combined: boolean;
  /** Bumped whenever a preset is (re)selected or the town changes, so the
   *  active filters get re-applied against the new scope. */
  scopeVersion: number;
  parcelColorMode: ParcelColorMode;
  onParcelColorMode: (mode: ParcelColorMode) => void;
}

export default function LayerRow({
  config,
  active,
  onToggle,
  onDataChange,
  onStatsChange,
  onLoadingChange,
  presetFilters,
  townCandidates,
  townBBox,
  townName,
  locked,
  combined,
  scopeVersion,
  parcelColorMode,
  onParcelColorMode,
}: LayerRowProps) {
  const { geojson, stats, loading, error, applyFilters } = useMapLayer(
    config,
    townCandidates,
    townBBox,
  );
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Remembered so "Try again" repeats the request that failed.
  const lastSpecs = useRef<FilterSpec[]>([]);
  const load = (specs: FilterSpec[]) => {
    lastSpecs.current = specs;
    applyFilters(specs);
  };

  // Parcels can be recolored by attribute (Category or Assessed Value)
  // without a re-fetch — purely a client-side restyle of the geojson already
  // on hand. Irrelevant for every other layer, which keeps its server/
  // recolorLayer color untouched.
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

  useEffect(() => {
    onLoadingChange(config.id, active && loading);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, active]);

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
    load(initialSpecs ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, scopeVersion]);

  const Icon = config.icon;
  const hasFilters = config.filterList.length > 0;
  const empty = !loading && !error && geojson?.features.length === 0;

  return (
    <div className={styles.layer} data-active={active || undefined}>
      <Switch
        checked={active}
        onChange={(event) => onToggle(config.id, event.currentTarget.checked)}
        color={config.color}
        labelPosition="left"
        label={
          <span className={styles.layerLabel}>
            <span
              className={styles.layerIcon}
              style={{ '--c': config.color } as CSSProperties}
            >
              <Icon size={18} stroke={1.8} />
            </span>
            <span>
              <span className={styles.layerTitle}>{config.title}</span>
              <span className={styles.layerDesc}>{config.description}</span>
            </span>
          </span>
        }
        styles={{
          body: { justifyContent: 'space-between', alignItems: 'center' },
          labelWrapper: { flex: 1, minWidth: 0 },
          label: { cursor: 'pointer', paddingInlineEnd: 12 },
          track: { cursor: 'pointer' },
        }}
      />

      {active && (
        <div className={styles.layerBody}>
          {loading && (
            <div className={styles.layerNote}>
              <Loader size={14} color={config.color} /> Loading…
            </div>
          )}
          {error && (
            <div className={`${styles.layerNote} ${styles.layerError}`}>
              This layer didn’t load.
              <button
                type="button"
                className={styles.linkButton}
                onClick={() => load(lastSpecs.current)}
              >
                Try again
              </button>
            </div>
          )}
          {empty && (
            <div className={styles.layerNote}>
              Nothing to show in {townName}
              {hasFilters ? ' with these filters.' : '.'}
            </div>
          )}
          {combined && !loading && !error && !empty && (
            <div className={styles.layerNote}>
              Zoning and soil are both on, so the map shows where they overlap
              instead of each one separately.
            </div>
          )}

          {config.id === 'parcels' && (
            <SegmentedControl
              fullWidth
              size="xs"
              aria-label="Color properties by"
              value={parcelColorMode}
              onChange={(v) => onParcelColorMode(v as ParcelColorMode)}
              data={[
                { label: 'Color by type', value: 'category' },
                { label: 'Color by value', value: 'value' },
              ]}
            />
          )}

          {hasFilters && (
            <>
              <button
                type="button"
                className={styles.filterToggle}
                aria-expanded={filtersOpen}
                onClick={() => setFiltersOpen((open) => !open)}
              >
                {locked ? (
                  <IconLock size={14} />
                ) : (
                  <IconAdjustmentsHorizontal size={14} />
                )}
                {locked ? 'Filters set by your question' : 'Filter'}
                <IconChevronDown
                  size={14}
                  style={{ transform: filtersOpen ? 'rotate(180deg)' : 'none' }}
                />
              </button>
              {/* Hidden rather than unmounted, so the form keeps the user's
                  selections while it's closed. */}
              <div className={styles.filters} hidden={!filtersOpen}>
                {locked && (
                  <div
                    className={styles.layerNote}
                    style={{ marginBottom: 10 }}
                  >
                    {config.filterList.some((d) => d.filter_style === 'Range')
                      ? 'These choices are part of the question you picked. Sliders can still be adjusted; turn the layer off and on to change the rest.'
                      : 'These choices are part of the question you picked. Turn the layer off and on to change them.'}
                  </div>
                )}
                <FilterWrap
                  key={scopeVersion}
                  filterList={config.filterList}
                  handleApply={load}
                  initialSpecs={initialSpecs}
                  locked={locked}
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
