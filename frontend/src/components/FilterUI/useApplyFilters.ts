import axios from 'axios';
import { Location } from '../profile/profileStore';

export function useApplyFilters() {
  return async function apply(
    dataURL: string,
    filters: Record<string, any>,
    format?: string,
    onData?: (data: any) => void,
  ) {
    if (!dataURL) return;
    try {
      const res = await axios.post(dataURL, { filters, format });
      onData?.(res.data);
    } catch (err) {
      console.error('Error fetching filtered data:', err);
    }
  };
}

export function buildFilters(location: Location) {
  const filters: Record<string, string[]> = {};
  if (location.county) filters['County'] = [location.county];
  if (location.rpc) filters['RPC'] = [location.rpc];
  if (location.town) {
    const town = location.town.split(' ')[0];
    filters['Jurisdiction'] = [town];
  }
  return filters;
}
