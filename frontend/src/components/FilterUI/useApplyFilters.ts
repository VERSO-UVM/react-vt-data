import axios from 'axios';
import { Location } from '../profile/profileStore';

export type FilterValue = string[] | { min: number; max: number };

type apiFilterParams = {
  dataURL: string;
  filters: FilterValue[];
  onData?: (data: any, metadata?: any, tableData?: any) => void;
};

export function useApplyFilters() {
  return async function apply(params: apiFilterParams) {
    const { dataURL, filters, onData } = params;
    if (!dataURL) return;
    try {
      const res = await axios.post(dataURL, { filters });
      const responseData = res.data;
      const data = responseData.data || responseData; // handle both shapes
      const metadata = responseData.metadata;
      const tableData = responseData.tableData;

      onData?.(data, metadata, tableData);
    } catch (err) {
      console.error('Error fetching filtered data:', err);
    }
  };
}

type filterRange = { col: string; selected: [number, number] };

export function buildFilters(location: Location, range?: filterRange) {
  const filters: Record<string, FilterValue> = {};
  // Full location name (matches the ACS NAME column / used by QCEW for statewide).
  filters['Location'] = [location.name];
  if (location.county) filters['County'] = [location.county];
  if (location.rpc) filters['RPC'] = [location.rpc];
  if (location.town) filters['Jurisdiction'] = [location.town.split(' ')[0]];
  if (range)
    filters[range.col] = { min: range.selected[0], max: range.selected[1] };
  return filters;
}
