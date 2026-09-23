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

/** Union-based zoned-area totals from the zoning geo query. Unions (not
 *  summed per-district acres) so overlays on top of base districts aren't
 *  double counted. */
export type TownAreaStat = {
  town: string;
  county: string;
  matched_acres: number;
  total_acres: number;
};
export type DistrictAreaStat = { district_type: string; acres: number };
export type LayerStats = {
  /** Every zoned town: its total, and how much of it matches the filters. */
  towns: TownAreaStat[];
  /** Matched area per district type, within the fetch's town scope. */
  districts: DistrictAreaStat[];
  /** The townCandidates the fetch was scoped to — lets consumers ignore
   *  stats left over from a previously selected town. */
  scope: string[] | null;
};

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
  // Server-computed area stats that arrive alongside 'geojson-stats'
  // responses (zoning). Null for every other layer.
  const [stats, setStats] = useState<LayerStats | null>(null);
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
        let fc: FeatureCollection;
        if (config.method === 'GET') {
          const res = await axios.get(config.dataURL);
          fc = cropToBBox(res.data as FeatureCollection, townBBox);
        } else {
          const scopedSpecs = applyJurisdictionScope(
            config,
            specs,
            townCandidates,
          );
          const assembledPayload = assemble(scopedSpecs);

          // Zoning and parcels can filter across multiple source tables at
          // once (e.g. parcels' info + tax tables), so they need the full
          // specs list [...]; single-source endpoints (wastewater, flood)
          // require a bare object {...}, so merge every spec's filters on
          // that one table (flood has two checkbox groups on one table).
          let formattedPayload: unknown;
          if (config.id === 'zoning' || config.id === 'parcels') {
            formattedPayload = Array.isArray(assembledPayload)
              ? assembledPayload
              : [assembledPayload];
          } else {
            const [first, ...rest] = assembledPayload;
            formattedPayload = first
              ? {
                  ...first,
                  filters: Object.assign(
                    {},
                    first.filters,
                    ...rest
                      .filter((s) => s.filter_table === first.filter_table)
                      .map((s) => s.filters),
                  ),
                }
              : {};
          }

          const res = await postRequest({
            dataURL: config.dataURL,
            payload: formattedPayload,
          });

          const rawFc = (
            config.responseShape === 'geojson-stats' ? res.geojson : res
          ) as FeatureCollection;
          fc = cropToBBox(rawFc, townBBox);
          if (config.responseShape === 'geojson-stats') {
            setStats({
              towns: res.town_stats ?? [],
              districts: res.district_stats ?? [],
              scope: townCandidates,
            });
          }
        }
        setGeojson(recolorLayer(config.id, fc));
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

  return {
    geojson,
    legend,
    stats,
    loading,
    applyFilters,
    loadInitial,
    fetchLegend,
  };
}
