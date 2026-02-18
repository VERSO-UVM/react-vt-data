import axios from 'axios';
import { Location } from '../profile/profileStore';

export function useApplyFilters() {
  return async function apply(
    dataURL: string,
    filters: Record<string, any>,
    format?: string,
    dataKey?: string,
    onData?: (data: any, metadata?: any, tableData?: any) => void,
    extra?: Record<string, any>,
  ) {
    if (!dataURL) return;
    try {
      const res = await axios.post(dataURL, { filters, format, ...extra });
      let responseData = res.data; // handle both shapes
      let data = responseData.data || responseData;
      const metadata = responseData.metadata;
      const tableData = responseData.tableData;

      if (dataKey) {
        const keys = dataKey.split('.');
        for (const key of keys) {
          data = data?.[key];
        }
      }
      onData?.(data, metadata, tableData);
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
