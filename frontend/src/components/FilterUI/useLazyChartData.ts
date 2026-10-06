import { useCallback, useEffect, useRef, useState } from 'react';
import { ChartDef } from '@/components/Charts/configs/ChartDefs';
import type { Location } from '@/components/profile/profileStore';
import { ChartMetadata, ChartPayload, DataRow } from '@/types/cachedCharts';
import { buildFilters, useApplyFilters } from './useApplyFilters';

interface Profile {
  myLocation: Location;
  comparison: Location;
  yearMin: number;
  yearMax: number;
}

// Everything fetched under one set of profile filters. A new signature starts
// a fresh store, and responses for an older signature are dropped, so a slow
// earlier request can never overwrite newer data.
interface Store {
  sig: string;
  chart: Record<string, ChartPayload>;
  compare: Record<string, ChartPayload>;
  compareTable: Record<string, DataRow[]>;
  done: Record<string, true>; // settled (success or failure), so no endless skeleton
}

const emptyStore = (sig: string): Store => ({
  sig,
  chart: {},
  compare: {},
  compareTable: {},
  done: {},
});

const isTableDef = (def: ChartDef) => def.subtype.startsWith('renderTable');

/**
 * Per-chart data loading for the gallery. A chart is fetched only after
 * `request(defId)` is called (the card scrolled into view); requests are
 * remembered, so a location/year change refetches only the charts the user
 * has actually seen.
 */
export function useLazyChartData(
  defs: ChartDef[],
  { myLocation, comparison, yearMin, yearMax }: Profile,
) {
  const applyFilters = useApplyFilters();
  const signature = JSON.stringify([myLocation, comparison, yearMin, yearMax]);

  const [requested, setRequested] = useState<ReadonlySet<string>>(new Set());
  const [store, setStore] = useState<Store>(() => emptyStore(signature));
  const currentSig = useRef(signature);
  const fetched = useRef(new Set<string>());

  const request = useCallback(
    (defId: string) =>
      setRequested((prev) =>
        prev.has(defId) ? prev : new Set(prev).add(defId),
      ),
    [],
  );

  useEffect(() => {
    currentSig.current = signature;
    const sig = signature;

    const update = (fn: (s: Store) => Store) =>
      setStore((prev) => {
        if (prev.sig === sig) return fn(prev);
        // first response under a new signature starts the new store;
        // a response for an old signature is ignored
        return sig === currentSig.current ? fn(emptyStore(sig)) : prev;
      });

    for (const def of defs) {
      const fetchKey = `${sig}|${def.id}`;
      if (!requested.has(def.id) || fetched.current.has(fetchKey)) continue;
      fetched.current.add(fetchKey);

      const table = isTableDef(def);
      // Table cards use the profile year range; charts may pin one year.
      const fixedYear = table
        ? undefined
        : (def.chartParams?.fixedYear as number | undefined);
      const range = {
        col: 'year',
        selected: [fixedYear ?? yearMin, fixedYear ?? yearMax] as [
          number,
          number,
        ],
      };

      const payload = (
        data: unknown,
        metadata: unknown,
        tableData: unknown,
      ): ChartPayload => ({
        data: data as DataRow[],
        metadata: metadata as ChartMetadata,
        tableData: tableData as DataRow[] | undefined,
      });

      const main = applyFilters({
        dataURL: def.url,
        filters: buildFilters(myLocation, range),
        onData: (data, metadata, tableData) =>
          update((s) => ({
            ...s,
            chart: {
              ...s.chart,
              [def.id]: table
                ? ({
                    data: data as DataRow[],
                    metadata: metadata as ChartMetadata,
                  } as ChartPayload)
                : payload(data, metadata, tableData),
            },
          })),
      });

      // table cards only compare when a comparison place is chosen
      const compare =
        table && !comparison.name
          ? undefined
          : applyFilters({
              dataURL: def.url,
              filters: buildFilters(comparison, range),
              onData: (data, metadata, tableData) =>
                update((s) =>
                  table
                    ? {
                        ...s,
                        compareTable: {
                          ...s.compareTable,
                          [def.id]: data as DataRow[],
                        },
                      }
                    : {
                        ...s,
                        compare: {
                          ...s.compare,
                          [def.id]: payload(data, metadata, tableData),
                        },
                      },
                ),
            });

      void Promise.all([main, compare]).then(() =>
        update((s) => ({ ...s, done: { ...s.done, [def.id]: true } })),
      );
    }
  }, [
    defs,
    requested,
    signature,
    applyFilters,
    myLocation,
    comparison,
    yearMin,
    yearMax,
  ]);

  // Between a profile change and its first response the old store is stale.
  const current = store.sig === signature ? store : emptyStore(signature);

  return {
    chartData: current.chart,
    compareChartData: current.compare,
    compareTableData: current.compareTable,
    request,
    /** True until the chart's requests have settled. */
    isLoading: (defId: string) => !current.done[defId],
  };
}
