import { useCallback } from 'react';
import axios from 'axios';
import { Location } from '../profile/profileStore';

export type FilterValue = string[] | { min: number; max: number };

type apiFilterParams = {
  dataURL: string;
  filters: Record<string, FilterValue>;
  onData?: (data: unknown, metadata?: unknown, tableData?: unknown) => void;
};

type Payload = { data: unknown; metadata?: unknown; tableData?: unknown };

// Identical requests (same url + filters) share one network call, both while
// in flight and afterwards: several charts hit the same ACS endpoint, the
// default comparison equals the main location, and cards remount on tab switch.
// Filters are part of the key, so a new location/year range simply misses.
const requestCache = new Map<string, Promise<Payload>>();

export function useApplyFilters() {
  return useCallback(async function apply(params: apiFilterParams) {
    const { dataURL, filters, onData } = params;
    if (!dataURL) return;
    const key = `${dataURL}::${JSON.stringify(filters)}`;
    let request = requestCache.get(key);
    if (!request) {
      request = axios.post(dataURL, { filters }).then((res) => {
        const responseData = res.data;
        return {
          data: responseData.data || responseData, // handle both shapes
          metadata: responseData.metadata,
          tableData: responseData.tableData,
        };
      });
      requestCache.set(key, request);
    }
    try {
      const { data, metadata, tableData } = await request;
      onData?.(data, metadata, tableData);
    } catch (err) {
      requestCache.delete(key); // let a later call retry
      console.error('Error fetching filtered data:', err);
    }
  }, []);
}

type filterRange = { col: string; selected: [number, number] };

export function buildFilters(location: Location, range?: filterRange) {
  const filters: Record<string, FilterValue> = {};
  // Full location name (matches the ACS NAME column / used by QCEW for statewide).
  filters['Location'] = [location.name];
  if (location.county) filters['County'] = [location.county];
  if (location.rpc) filters['RPC'] = [location.rpc];
  // `town` is already the Census-style name ("Rockingham town") every
  // dataset's town column stores, so it is sent whole.
  if (location.town) filters['Jurisdiction'] = [location.town];
  if (range)
    filters[range.col] = { min: range.selected[0], max: range.selected[1] };
  return filters;
}
