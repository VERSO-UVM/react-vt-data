'use client';

/**
 * @description
 *   Owns the fetch/filter/legend lifecycle for ONE layer. Each active layer
 *   in the explorer gets its own instance of this hook via <LayerRow>, so
 *   layers never share state — this is what makes concurrent, independently
 *   filterable layers possible (see FilterRedux's per-instance useForm
 *   pattern, which this mirrors).
 */

import { useState, useCallback } from 'react';
import axios from 'axios';
import type { FeatureCollection } from 'geojson';
import { postRequest } from '@/components/FilterRedux/filterRequest';
import { assemble } from '@/components/FilterRedux/apiHelpers';
import type { FilterSpec } from '@/components/FilterRedux/filterTypes';
import type { MapLayerConfig } from '@/app/mapping/MapLayers';
import type { LegendRow } from '@/components/Legend';
import { applyJurisdictionScope } from './jurisdictionMatch';
import { recolorLayer } from './layerColors';
import { cropToBBox } from './spatialScope';

/** @param townCandidates - plausible spellings of the selected town's name
 *    (see jurisdictionCandidates), auto-merged into every fetch this layer
 *    makes so requests stay scoped to that town. Null/empty = unscoped.
 *  @param townBBox - the selected town's bounding box. Every fetch is
 *    cropped to it client-side, regardless of townCandidates — this is what
 *    keeps layers with no server-side jurisdiction filter (flood) from
 *    rendering statewide data, and safety-nets any jurisdiction name-match
 *    misses on the other layers. */
export function useMapLayer(
  config: MapLayerConfig,
  townCandidates: string[] | null = null,
  townBBox: [number, number, number, number] | null = null,
) {
  const [geojson, setGeojson] = useState<FeatureCollection | null>(null);
  const [legend, setLegend] = useState<LegendRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const fetchLegend = useCallback(async () => {
    if (!config.legendURL) return;
    try {
      const res = await axios.get(config.legendURL);
      setLegend(res.data as LegendRow[]);
    } catch (e) {
      console.error(`legend fetch failed for ${config.id}`, e);
      setLegend([]);
    }
  }, [config.legendURL, config.id]);

  /** Fetch data for this layer given a set of filter specs (possibly empty). */
  // src/app/mapping/UseMapLayer.ts

  const applyFilters = useCallback(
    async (specs: FilterSpec[]) => {
      setLoading(true);
      try {
        if (config.method === 'GET' || config.filterList.length === 0) {
          const res = await axios.get(config.dataURL);
          const fc = cropToBBox(res.data as FeatureCollection, townBBox);
          setGeojson(recolorLayer(config.id, fc));
        } else {
          const scopedSpecs = applyJurisdictionScope(
            config,
            specs,
            townCandidates,
          );
          const assembledPayload = assemble(scopedSpecs);

          // Zoning requires a top-level list [...], whereas wastewater endpoints require an object {...}
          let formattedPayload: unknown;
          if (config.id === 'zoning') {
            formattedPayload = Array.isArray(assembledPayload)
              ? assembledPayload
              : [assembledPayload];
          } else {
            formattedPayload = Array.isArray(assembledPayload)
              ? (assembledPayload[0] ?? {})
              : assembledPayload;
          }

          const res = await postRequest({
            dataURL: config.dataURL,
            payload: formattedPayload,
          });

          const rawFc = (
            config.responseShape === 'geojson-stats' ? res.geojson : res
          ) as FeatureCollection;
          const fc = cropToBBox(rawFc, townBBox);
          setGeojson(recolorLayer(config.id, fc));
        }
        setLoaded(true);
      } catch (e) {
        console.error(`data fetch failed for ${config.id}`, e);
        setGeojson(null);
      } finally {
        setLoading(false);
      }
    },
    [config, townCandidates, townBBox],
  );
  /** Called the first time a layer is switched on: loads with no filters,
   *  matching the old per-page "initial load" behavior. No-ops on repeat
   *  toggles so re-enabling a layer doesn't discard the user's filters. */
  const loadInitial = useCallback(() => {
    if (loaded) return;
    applyFilters([]);
    fetchLegend();
  }, [loaded, applyFilters, fetchLegend]);

  return { geojson, legend, loading, applyFilters, loadInitial, fetchLegend };
}
