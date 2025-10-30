import axios from 'axios';

export function useApplyFilters(dataURL: string, onData?: (data: any) => void) {
  return async function apply(filters: Record<string, any>, format?: string) {
    if (!dataURL) return;

    try {
      const res = await axios.post(dataURL, { filters, format });
      onData?.(res.data);
    } catch (err) {
      console.error('Error fetching filtered data:', err);
    }
  };
}
